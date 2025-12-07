# -*- coding: utf-8 -*-
# pylint: disable=too-many-branches, too-many-statements, no-name-in-module
"""基于 agentscope 实现的狼人杀游戏。"""
import re
from typing import Any
from datetime import datetime
from agentscope.message._message_base import Msg
import numpy as np

from config import config
from core.utils import (
    majority_vote,
    names_to_str,
    EchoAgent,
    MAX_GAME_ROUND,
    MAX_DISCUSSION_ROUND,
    Players,
    is_abstain_vote,
    Prompts,
)
from core.game_logger import GameLogger
from models.schemas import (
    DiscussionModel,
    get_vote_model,
    ReflectionModel,
)
from models.roles import (
    RoleFactory,
    Werewolf,
    Villager,
    Seer,
    Witch,
    Hunter,
)

from agentscope.agent import ReActAgent
from agentscope.pipeline import (
    MsgHub,
    sequential_pipeline,
    fanout_pipeline,
)


moderator = EchoAgent()


def _format_impression_context(
    player_name: str,
    players: Players,
    public_vote_history: list[dict[str, Any]],
    round_public_records: list[dict[str, Any]],
    round_num: int,
    phase: str,
) -> str:
    """Compose private上下文给当前玩家使用。"""

    impressions = players.get_impressions(player_name, alive_only=True)
    impression_lines = [f"{name}: {imp}" for name, imp in impressions.items()]

    record_lines = []
    for rec in round_public_records:
        speech = rec.get("speech", "")
        behavior = rec.get("behavior", "")
        seg = f"{rec['player']}:"
        if behavior:
            seg += f" [{behavior}]"
        if speech:
            seg += f" {speech}"
        if seg:
            record_lines.append(seg)

    recent_votes = [
        f"第{item['round']}轮{item['phase']}: {item['voter']} -> {item['target']}"
        for item in public_vote_history[-8:]
    ]

    parts = [
        f"当前轮次: 第{round_num}轮 ({phase})",
        "你的对其他存活玩家的印象:",
        "\n".join(impression_lines) if impression_lines else "(暂无)",
        "本轮公开发言与动作:",
        "\n".join(record_lines) if record_lines else "(当前尚无公开发言)",
        "历史公开投票记录 (最多显示近8条):",
        "\n".join(recent_votes) if recent_votes else "(暂无记录)",
        "注意: 你的思考过程 thought 不会被其他玩家看到。",
    ]
    return "\n".join(parts)


def _attach_context(prompt: Msg, context: str) -> Msg:
    """Create a new moderator message with附加上下文。"""
    return Msg(prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)


def _extract_msg_fields(msg: Msg) -> tuple[str, str, str, str]:
    """从消息中提取 speech/behavior/thought 及原始内容。"""
    md = getattr(msg, "metadata", {}) or {}
    speech = md.get("speech")
    behavior = md.get("behavior")
    thought = md.get("thought")

    def _clean_text(val: Any) -> str:
        """将可能为列表/字典或 generate_response(...) 的值转换为纯文本。"""
        if val is None:
            return ""
        # 处理列表形式: [{'type': 'text', 'text': 'xxx'}]
        if isinstance(val, list):
            items = []
            for item in val:
                if isinstance(item, dict) and "text" in item:
                    items.append(str(item.get("text", "")))
                else:
                    items.append(str(item))
            val = " ".join(items)
        elif isinstance(val, dict) and "text" in val:
            val = val.get("text", "")
        val = str(val).strip()
        # 去除 generate_response("...") 包裹，即使前后有前缀/空格
        match = re.search(
            r"generate_response\(\s*[\"']?(.*?)[\"']?\s*\)\s*$", val)
        if match:
            val = match.group(1)
        else:
            inline = re.search(
                r"generate_response\(\s*[\"']?(.*?)[\"']?\s*\)", val)
            if inline:
                val = inline.group(1)
        return val

    speech_s = _clean_text(speech)
    behavior_s = _clean_text(behavior)
    thought_s = _clean_text(thought)
    content_s = _clean_text(getattr(msg, "content", ""))
    return speech_s, behavior_s, thought_s, content_s


async def _reflection_phase(
    players: Players,
    round_public_records: list[dict[str, Any]],
    public_vote_history: list[dict[str, Any]],
    round_num: int,
    moderator_agent: EchoAgent,
    logger: GameLogger,
) -> None:
    """让每位存活玩家在回合结束后更新印象。"""

    for role in players.current_alive:
        context = _format_impression_context(
            role.name,
            players,
            public_vote_history,
            round_public_records,
            round_num,
            "回合反思",
        )
        prompt = await moderator_agent(
            f"[{role.name} ONLY] 本轮结束，请反思并更新你对其他存活玩家的印象。"
            "只填写需要更新的玩家，未提及的保持不变。思考过程 thought 仅自己可见。",
        )
        msg_reflect = await role.agent(
            _attach_context(prompt, context),
            structured_model=ReflectionModel,
        )
        updates = msg_reflect.metadata.get("impression_updates") or {}
        players.apply_impression_updates(role.name, updates)

        thought = msg_reflect.metadata.get("thought", "")
        logger.log_reflection(
            round_num,
            role.name,
            thought,
            players.get_impressions(role.name, alive_only=True),
        )


async def werewolves_game(agents: list[ReActAgent]) -> None:
    """狼人杀游戏的主入口

    Args:
        agents (`list[ReActAgent]`):
            9个智能体的列表。
    """
    assert len(agents) == 9, "The werewolf game needs exactly 9 players."

    # 初始化游戏日志
    game_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    logger = GameLogger(game_id)

    # 跟踪公开投票和当轮公开发言，用于印象与决策上下文
    public_vote_history: list[dict[str, Any]] = []

    # 初始化玩家状态
    players = Players()

    # 女巫是否拥有解药和毒药
    healing, poison = True, True

    # 如果是第一天，死者可以发表遗言
    first_day = True

    # 广播游戏开始消息
    async with MsgHub(participants=agents) as greeting_hub:
        await greeting_hub.broadcast(
            await moderator(
                Prompts.to_all_new_game.format(names_to_str(agents)),
            ),
        )

    # 给智能体分配角色
    roles = ["werewolf"] * 3 + ["villager"] * 3 + ["seer", "witch", "hunter"]
    np.random.shuffle(agents)
    np.random.shuffle(roles)

    for agent, role_name in zip(agents, roles):
        # 创建角色对象
        role_obj = RoleFactory.create_role(agent, role_name)

        # 告知智能体其角色
        await agent.observe(
            await moderator(
                f"[{agent.name} ONLY] {agent.name}, your role is {role_name}.",
            ),
        )

        # 发送角色专属指令
        instruction = role_obj.get_instruction()
        if instruction:
            await agent.observe(
                await moderator(f"[{agent.name} ONLY] {instruction}")
            )

        players.add_player(agent, role_name, role_obj)

    # 打印角色信息
    players.print_roles()

    # 记录玩家列表到日志
    players_info = [(name, role)
                    for name, role in players.name_to_role.items()]
    logger.log_players(players_info)

    # 游戏开始！
    for round_num in range(1, MAX_GAME_ROUND + 1):
        round_public_records: list[dict[str, Any]] = []
        # 开始新回合
        logger.start_round(round_num)
        # 为所有玩家创建 MsgHub 以广播消息
        alive_agents = [role.agent for role in players.current_alive]
        async with MsgHub(
            participants=alive_agents,
            enable_auto_broadcast=False,  # 仅手动广播
            name="alive_players",
        ) as alive_players_hub:
            # 夜晚阶段
            logger.start_night()
            await alive_players_hub.broadcast(
                await moderator(Prompts.to_all_night),
            )
            killed_player, poisoned_player, shot_player = None, None, None

            # 狼人讨论
            werewolf_agents = [w.agent for w in players.werewolves]
            async with MsgHub(
                werewolf_agents,
                enable_auto_broadcast=True,
                announcement=await moderator(
                    Prompts.to_wolves_discussion.format(
                        names_to_str(werewolf_agents),
                        names_to_str(players.current_alive),
                    ),
                ),
                name="werewolves",
            ) as werewolves_hub:
                # 讨论
                n_werewolves = len(players.werewolves)
                for _ in range(1, MAX_DISCUSSION_ROUND * n_werewolves + 1):
                    werewolf = players.werewolves[_ % n_werewolves]
                    context = _format_impression_context(
                        werewolf.name,
                        players,
                        public_vote_history,
                        round_public_records,
                        round_num,
                        "夜晚讨论",
                    )
                    res = await werewolf.discuss_with_team(
                        _attach_context(await moderator(""), context),
                    )
                    # 记录狼人讨论
                    speech, behavior, thought, content_raw = _extract_msg_fields(
                        res)
                    logger.log_message_detail(
                        "狼人讨论",
                        werewolf.name,
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought,
                    )
                    if _ % n_werewolves == 0 and res.metadata.get(
                        "reach_agreement",
                    ):
                        break

                # 狼人投票
                # 禁用自动广播以避免跟票
                werewolves_hub.set_auto_broadcast(False)
                vote_prompt = await moderator(content=Prompts.to_wolves_vote)
                msgs_vote = []
                wolf_votes_for_majority: list[str | None] = []
                for werewolf in players.werewolves:
                    context = _format_impression_context(
                        werewolf.name,
                        players,
                        public_vote_history,
                        round_public_records,
                        round_num,
                        "夜晚投票",
                    )
                    msg = await werewolf.team_vote(
                        _attach_context(vote_prompt, context),
                        players.current_alive,
                    )
                    msgs_vote.append(msg)
                    speech, behavior, thought, content_raw = _extract_msg_fields(
                        msg)
                    # 记录狼人投票（狼必选目标，不允许弃权）
                    raw_vote = msg.metadata.get("vote")
                    vote_value = str(raw_vote).strip() if raw_vote else None
                    wolf_votes_for_majority.append(vote_value)

                    if vote_value:
                        logger.log_vote(
                            werewolf.name,
                            vote_value,
                            "狼人投票",
                            speech=speech or content_raw,
                            behavior=behavior,
                            thought=thought
                        )
                    else:
                        logger.log_message_detail(
                            "狼人投票",
                            werewolf.name,
                            speech=speech or content_raw,
                            behavior=behavior,
                            thought=thought,
                            action="未选择目标(应当必选)"
                        )

                killed_player, votes = majority_vote(wolf_votes_for_majority)
                # 记录狼人投票结果
                logger.log_vote_result(
                    killed_player or "无人出局",
                    votes,
                    "狼人投票结果",
                    "被选中击杀" if killed_player else "无人被击杀",
                )

                # 推迟投票结果的广播
                wolves_res_prompt = (
                    Prompts.to_wolves_res.format(votes, killed_player)
                    if killed_player
                    else Prompts.to_wolves_res_abstain.format(votes)
                )
                await werewolves_hub.broadcast(
                    [
                        *msgs_vote,
                        await moderator(wolves_res_prompt),
                    ],
                )

            # 女巫回合
            await alive_players_hub.broadcast(
                await moderator(Prompts.to_all_witch_turn),
            )
            for witch in players.witch:
                game_state = {
                    "killed_player": killed_player,
                    "alive_players": players.current_alive,
                    "moderator": moderator,
                    "context": _format_impression_context(
                        witch.name,
                        players,
                        public_vote_history,
                        round_public_records,
                        round_num,
                        "女巫行动",
                    ),
                }

                result = await witch.night_action(game_state)

                # Log resurrect speech
                r_speech = result.get("resurrect_speech")
                r_behavior = result.get("resurrect_behavior")
                r_thought = result.get("resurrect_thought")
                logger.log_message_detail(
                    "女巫行动(解药)",
                    witch.name,
                    speech=r_speech,
                    behavior=r_behavior,
                    thought=r_thought,
                )

                # Log poison speech
                p_speech = result.get("poison_speech")
                p_behavior = result.get("poison_behavior")
                p_thought = result.get("poison_thought")
                logger.log_message_detail(
                    "女巫行动(毒药)",
                    witch.name,
                    speech=p_speech,
                    behavior=p_behavior,
                    thought=p_thought,
                )

                # 处理解药
                if result.get("resurrect"):
                    logger.log_action("女巫行动", f"使用解药救了 {killed_player}")
                    killed_player = None

                # 处理毒药
                if result.get("poison"):
                    poisoned_player = result.get("poison")
                    logger.log_action("女巫行动", f"使用毒药毒杀了 {poisoned_player}")

            # 预言家回合
            await alive_players_hub.broadcast(
                await moderator(Prompts.to_all_seer_turn),
            )
            for seer in players.seer:
                game_state = {
                    "alive_players": players.current_alive,
                    "moderator": moderator,
                    "name_to_role": players.name_to_role,
                    "context": _format_impression_context(
                        seer.name,
                        players,
                        public_vote_history,
                        round_public_records,
                        round_num,
                        "预言家行动",
                    ),
                }

                result = await seer.night_action(game_state)

                # Log speech/behavior/thought
                logger.log_message_detail(
                    "预言家行动",
                    seer.name,
                    speech=result.get("speech"),
                    behavior=result.get("behavior"),
                    thought=result.get("thought"),
                )

                # 记录预言家查验
                if result and result.get("action") == "check":
                    checked_player = result.get("target")
                    role_result = result.get("result")
                    if checked_player and role_result:
                        logger.log_action(
                            "预言家查验", f"查验 {checked_player}, 结果: {role_result}")

            # 猎人回合
            for hunter in players.hunter:
                # 如果被杀且不是被女巫毒死
                if (
                    killed_player == hunter.name
                    and poisoned_player != hunter.name
                ):
                    context = _format_impression_context(
                        hunter.name,
                        players,
                        public_vote_history,
                        round_public_records,
                        round_num,
                        "猎人开枪",
                    )
                    shoot_res = await hunter.shoot(
                        players.current_alive,
                        moderator,
                        context,
                    )
                    if shoot_res:
                        shot_player = shoot_res.get("target")
                        logger.log_message_detail(
                            "猎人开枪",
                            hunter.name,
                            speech=shoot_res.get("speech"),
                            behavior=shoot_res.get("behavior"),
                            thought=shoot_res.get("thought"),
                        )
                    if shot_player:
                        logger.log_action(
                            "猎人开枪", f"猎人 {hunter.name} 开枪击杀了 {shot_player}")

            # 更新存活玩家
            dead_tonight = [killed_player, poisoned_player, shot_player]
            # 记录夜晚死亡
            logger.log_death("夜晚死亡", [p for p in dead_tonight if p])
            players.update_players(dead_tonight)

            # 白天阶段
            logger.start_day()
            if len([_ for _ in dead_tonight if _]) > 0:
                announcement = f"天亮了，请所有玩家睁眼。昨晚 {names_to_str([_ for _ in dead_tonight if _])} 被淘汰。"
                logger.log_announcement(announcement)
                await alive_players_hub.broadcast(
                    await moderator(
                        Prompts.to_all_day.format(
                            names_to_str([_ for _ in dead_tonight if _]),
                        ),
                    ),
                )

                # 第一晚被杀的玩家发表遗言
                if killed_player and first_day:
                    msg_moderator = await moderator(
                        Prompts.to_dead_player.format(killed_player),
                    )
                    await alive_players_hub.broadcast(msg_moderator)
                    # 发表遗言
                    role_obj = players.name_to_role_obj[killed_player]
                    last_msg = await role_obj.leave_last_words(msg_moderator)

                    speech, behavior, thought, content_raw = _extract_msg_fields(
                        last_msg)
                    logger.log_message_detail(
                        "遗言",
                        killed_player,
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought,
                    )
                    round_public_records.append(
                        {
                            "player": killed_player,
                            "speech": speech or content_raw,
                            "behavior": behavior,
                            "phase": "遗言",
                        },
                    )

                    await alive_players_hub.broadcast(last_msg)

            else:
                logger.log_announcement("天亮了，请所有玩家睁眼。昨晚平安夜，无人被淘汰。")
                await alive_players_hub.broadcast(
                    await moderator(Prompts.to_all_peace),
                )

            # 检查胜利条件
            res = players.check_winning()
            if res:
                logger.log_announcement(f"游戏结束: {res}")
                await moderator(res)
                logger.close()
                break

            # 讨论
            await alive_players_hub.broadcast(
                await moderator(
                    Prompts.to_all_discuss.format(
                        names=names_to_str(players.current_alive),
                    ),
                ),
            )
            # 开启自动广播以进行讨论
            alive_players_hub.set_auto_broadcast(True)
            # 更新存活智能体列表
            current_alive_agents = [
                role.agent for role in players.current_alive]

            # 使用 sequential_pipeline 进行讨论，并记录每个玩家的发言
            discussion_msgs = []
            for role in players.current_alive:
                context = _format_impression_context(
                    role.name,
                    players,
                    public_vote_history,
                    round_public_records,
                    round_num,
                    "白天讨论",
                )
                msg = await role.day_discussion(
                    _attach_context(await moderator(""), context),
                )
                discussion_msgs.append(msg)
                speech, behavior, thought, content_raw = _extract_msg_fields(
                    msg)
                logger.log_message_detail(
                    "白天讨论",
                    role.name,
                    speech=speech or content_raw,
                    behavior=behavior,
                    thought=thought,
                )
                round_public_records.append(
                    {
                        "player": role.name,
                        "speech": speech or content_raw,
                        "behavior": behavior,
                        "phase": "白天讨论",
                    },
                )

            # 禁用自动广播以避免泄露信息
            alive_players_hub.set_auto_broadcast(False)

            # 投票
            vote_prompt = await moderator(
                Prompts.to_all_vote.format(
                    names_to_str(players.current_alive),
                ),
            )
            msgs_vote = []
            day_votes_for_majority: list[str | None] = []
            for role in players.current_alive:
                context = _format_impression_context(
                    role.name,
                    players,
                    public_vote_history,
                    round_public_records,
                    round_num,
                    "白天投票",
                )
                msg = await role.vote(
                    _attach_context(vote_prompt, context),
                    players.current_alive,
                )
                msgs_vote.append(msg)
                speech, behavior, thought, content_raw = _extract_msg_fields(
                    msg)
                # 记录投票
                raw_vote = msg.metadata.get("vote")
                abstained = is_abstain_vote(raw_vote)
                vote_value = None if abstained else str(raw_vote).strip()
                day_votes_for_majority.append(vote_value)

                if vote_value:
                    logger.log_vote(
                        role.name,
                        vote_value,
                        "投票",
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought
                    )
                    public_vote_history.append(
                        {
                            "round": round_num,
                            "phase": "白天",
                            "voter": role.name,
                            "target": vote_value,
                        },
                    )
                else:
                    logger.log_message_detail(
                        "投票",
                        role.name,
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought,
                        action="弃票"
                    )

            voted_player, votes = majority_vote(day_votes_for_majority)
            # 记录投票结果
            if voted_player:
                logger.log_vote_result(voted_player, votes, "投票结果", "被投出")
            else:
                logger.log_vote_result("无人出局", votes, "投票结果", "无人被投出")

            # 一起广播投票消息以避免相互影响
            voting_res_prompt = (
                Prompts.to_all_res.format(votes, voted_player)
                if voted_player
                else Prompts.to_all_res_abstain.format(votes)
            )
            voting_msgs = [
                *msgs_vote,
                await moderator(voting_res_prompt),
            ]

            # 如果被投出，发表遗言
            if voted_player:
                prompt_msg = await moderator(
                    Prompts.to_dead_player.format(voted_player),
                )
                role_obj = players.name_to_role_obj[voted_player]
                last_msg = await role_obj.leave_last_words(prompt_msg)

                speech, behavior, thought, content_raw = _extract_msg_fields(
                    last_msg)
                logger.log_message_detail(
                    "遗言",
                    voted_player,
                    speech=speech or content_raw,
                    behavior=behavior,
                    thought=thought,
                )
                round_public_records.append(
                    {
                        "player": voted_player,
                        "speech": speech or content_raw,
                        "behavior": behavior,
                        "phase": "遗言",
                    },
                )

                voting_msgs.extend([prompt_msg, last_msg])

            await alive_players_hub.broadcast(voting_msgs)

            # 如果被投出的玩家是猎人，他可以开枪带走一人
            shot_player = None
            for hunter in players.hunter:
                if voted_player == hunter.name:
                    context = _format_impression_context(
                        hunter.name,
                        players,
                        public_vote_history,
                        round_public_records,
                        round_num,
                        "猎人开枪",
                    )
                    shoot_res = await hunter.shoot(
                        players.current_alive,
                        moderator,
                        context,
                    )
                    if shoot_res:
                        shot_player = shoot_res.get("target")
                        logger.log_message_detail(
                            "猎人开枪",
                            hunter.name,
                            speech=shoot_res.get("speech"),
                            behavior=shoot_res.get("behavior"),
                            thought=shoot_res.get("thought"),
                        )
                    if shot_player:
                        logger.log_action(
                            "猎人开枪", f"猎人 {hunter.name} 开枪击杀了 {shot_player}")
                        await alive_players_hub.broadcast(
                            await moderator(
                                Prompts.to_all_hunter_shoot.format(
                                    shot_player,
                                ),
                            ),
                        )

            # 更新存活玩家
            dead_today = [voted_player, shot_player]
            # 记录白天死亡
            logger.log_death("白天死亡", [p for p in dead_today if p])
            players.update_players(dead_today)

            # 回合结束，存活玩家更新印象
            await _reflection_phase(
                players,
                round_public_records,
                public_vote_history,
                round_num,
                moderator,
                logger,
            )

            # 检查胜利条件
            res = players.check_winning()
            if res:
                logger.log_announcement(f"游戏结束: {res}")
                async with MsgHub(players.all_players) as all_players_hub:
                    res_msg = await moderator(res)
                    await all_players_hub.broadcast(res_msg)
                logger.close()
                break

        # 天黑了
        first_day = False

    # 游戏结束，每位玩家发表感言
    await fanout_pipeline(
        agents=agents,
        msg=await moderator(Prompts.to_all_reflect),
    )

    # 确保日志文件关闭
    logger.close()
