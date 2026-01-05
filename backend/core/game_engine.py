# -*- coding: utf-8 -*-
# pylint: disable=too-many-branches, too-many-statements, no-name-in-module
"""基于 agentscope 实现的狼人杀游戏。"""
import asyncio
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
from core.knowledge_base import PlayerKnowledgeStore
from core.game_logger import GameLogger
from models.schemas import (
    DiscussionModel,
    get_vote_model,
    ReflectionModel,
    KnowledgeUpdateModel,
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
from agentscope.pipeline import MsgHub


moderator = EchoAgent()


def _format_impression_context(
    player_name: str,
    players: Players,
    vote_history: list[dict[str, Any]],
    round_public_records: list[dict[str, Any]],
    round_num: int,
    phase: str,
) -> str:
    """为当前玩家构建私有上下文以供使用。"""

    impressions = players.get_impressions(player_name, alive_only=True)
    impression_lines = [f"{name}: {imp}" for name, imp in impressions.items()]

    record_lines = []
    for rec in round_public_records:
        scope = rec.get("scope")
        # 仅狼人可见的记录：非狼人跳过，避免夜聊信息外泄
        if scope == "wolves_only" and not players.is_werewolf(player_name):
            continue
        speech = rec.get("speech", "")
        behavior = rec.get("behavior", "")
        seg = f"{rec['player']}:"
        if behavior:
            seg += f" [{behavior}]"
        if speech:
            seg += f" {speech}"
        if seg:
            record_lines.append(seg)

    knowledge = players.get_knowledge(player_name)

    # 仅向狼人提供的队友身份确认，避免出现“如果是狼人”等不确定描述
    wolf_team_lines: list[str] = []
    if players.is_werewolf(player_name):
        team_status = players.get_werewolf_team_status()
        for name, alive in team_status:
            wolf_team_lines.append(f"{name}: {'存活' if alive else '已出局'}")

    recent_votes = [
        f"第{item.get('round')}轮{item.get('phase')}: {item.get('voter')} -> {item.get('target') or '弃权/无效'}"
        for item in vote_history[-8:]
    ]

    parts = [
        f"当前轮次: 第{round_num}轮 ({phase})",
        "你的对其他存活玩家的印象:",
        "\n".join(impression_lines) if impression_lines else "(暂无)",
        "你的长期游戏理解/经验 (跨局持久):",
        knowledge or "(目前为空)",
        *(
            ["你明确知道的狼人队友状态（含你自己）:"]
            + wolf_team_lines
            + ["注意：狼人始终清楚队友身份"]
            if wolf_team_lines
            else []
        ),
        "本轮公开发言与动作:",
        "\n".join(record_lines) if record_lines else "(当前尚无公开发言)",
        "历史公开投票记录 (最多显示近8条):",
        "\n".join(recent_votes) if recent_votes else "(暂无记录)",
        "注意: 你的思考过程 thought 不会被其他玩家看到。",
    ]
    return "\n".join(parts)


def _attach_context(prompt: Msg, context: str) -> Msg:
    """创建一个带有附加上下文的主持人消息。"""
    return Msg(prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)


def _strip_dsml_payload(text: str, field: str | None = None) -> str:
    """移除或提取 DSML/工具调用标记，保留可读文本。"""
    if not text or "DSML" not in text:
        return text

    # 优先提取与当前字段匹配的 parameter 文本
    if field:
        pattern = re.compile(
            r"<[^>]*DSML[^>]*parameter[^>]*name=\"?" +
            re.escape(field) +
            r"\"?[^>]*>(.*?)</[^>]*DSML[^>]*parameter>",
            re.DOTALL,
        )
        match = pattern.search(text)
        if match:
            return match.group(1).strip()

    # 否则去掉所有 DSML 标签，保留内部可见文本
    text = re.sub(r"<[^>]*DSML[^>]*>", "", text)
    text = re.sub(r"</[^>]*DSML[^>]*>", "", text)
    return text.strip()


def _extract_msg_fields(msg: Msg) -> tuple[str, str, str, str]:
    """从消息中提取 speech/behavior/thought 及原始内容。"""
    md = getattr(msg, "metadata", {}) or {}
    speech = md.get("speech")
    behavior = md.get("behavior")
    thought = md.get("thought")

    def _clean_text(val: Any, field: str | None = None) -> str:
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
        val = _strip_dsml_payload(val, field)
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

    speech_s = _clean_text(speech, "speech")
    behavior_s = _clean_text(behavior, "behavior")
    thought_s = _clean_text(thought, "thought")
    content_s = _clean_text(getattr(msg, "content", ""))
    return speech_s, behavior_s, thought_s, content_s


def _make_public_msg(
    msg: Msg,
    speech: str,
    behavior: str,
    content_raw: str,
) -> Msg:
    """生成仅包含可公开信息的消息，移除 thought 等私密字段。"""

    metadata = dict(getattr(msg, "metadata", {}) or {})
    metadata.pop("thought", None)

    parts = []
    if behavior:
        parts.append(f"[表现] {behavior}")
    visible_text = speech or content_raw
    if visible_text:
        parts.append(visible_text)
    content = "\n".join(parts) if parts else "(无发言)"

    return Msg(msg.name, content, role=msg.role, metadata=metadata)


async def _process_last_words(
    player_names: list[str],
    players: Players,
    vote_history: list[dict[str, Any]],
    round_public_records: list[dict[str, Any]],
    round_num: int,
    hub: MsgHub,
    logger: GameLogger,
    moderator_agent: EchoAgent,
) -> None:
    """让具备资格的出局玩家依次发表遗言。"""

    seen: set[str] = set()
    for name in player_names:
        if not name or name in seen:
            continue
        seen.add(name)

        prompt_msg = await moderator_agent(
            Prompts.to_dead_player.format(name),
        )
        await hub.broadcast(prompt_msg)

        role_obj = players.name_to_role_obj.get(name)
        if not role_obj:
            continue

        context = _format_impression_context(
            name,
            players,
            vote_history,
            round_public_records,
            round_num,
            "遗言",
        )

        last_msg = await role_obj.leave_last_words(
            _attach_context(prompt_msg, context),
        )

        speech, behavior, thought, content_raw = _extract_msg_fields(last_msg)
        logger.log_message_detail(
            "遗言",
            name,
            speech=speech or content_raw,
            behavior=behavior,
            thought=thought,
        )

        round_public_records.append(
            {
                "player": name,
                "speech": speech or content_raw,
                "behavior": behavior,
                "phase": "遗言",
            },
        )

        await hub.broadcast(_make_public_msg(last_msg, speech, behavior, content_raw))


async def _reflection_phase(
    players: Players,
    vote_history: list[dict[str, Any]],
    round_public_records: list[dict[str, Any]],
    round_num: int,
    moderator_agent: EchoAgent,
    logger: GameLogger,
    knowledge_store: PlayerKnowledgeStore,
    stop_event: Any | None = None,
) -> None:
    """让每位存活玩家在回合结束后更新印象。"""

    def _check_stop_local() -> None:
        """检查是否收到终止信号。"""
        if stop_event is not None and getattr(stop_event, "is_set", None):
            try:
                if stop_event.is_set():
                    raise asyncio.CancelledError("游戏被用户终止")
            except asyncio.CancelledError:
                raise
            except Exception:
                return

    async def _run_reflection_task(role_obj: Any) -> dict[str, Any]:
        _check_stop_local()
        await asyncio.sleep(0.4)  # 控制并行调用节奏
        context = _format_impression_context(
            role_obj.name,
            players,
            vote_history,
            round_public_records,
            round_num,
            "回合反思",
        )

        prompt = await moderator_agent(
            f"[{role_obj.name} ONLY] 本轮结束，请反思并更新你对其他存活玩家的印象。"
            "只填写需要更新的玩家，未提及的保持不变。思考过程 thought 仅自己可见。"
            f"{' 你作为狼人，清楚知道所有狼人队友（含已出局）。' if getattr(role_obj, 'role_name', '') == 'werewolf' else ''}",
        )
        msg_reflect = await role_obj.agent(
            _attach_context(prompt, context),
            structured_model=ReflectionModel,
        )

        knowledge_prompt = await moderator_agent(
            f"[{role_obj.name} ONLY] 在不泄露本局具体发言/投票细节的前提下，总结可复用的游戏理解。"
            "输出到 knowledge 字段，它会被保存为你的专属经验库并在未来行动时提供给你。",
        )
        msg_knowledge = await role_obj.agent(
            _attach_context(knowledge_prompt, context),
            structured_model=KnowledgeUpdateModel,
        )

        return {
            "role": role_obj,
            "updates": msg_reflect.metadata.get("impression_updates") or {},
            "thought": msg_reflect.metadata.get("thought", ""),
            "knowledge": msg_knowledge.metadata.get("knowledge", ""),
        }

    reflection_results = await asyncio.gather(
        *(_run_reflection_task(role) for role in players.current_alive),
    )

    for res in reflection_results:
        role_obj = res["role"]
        players.apply_impression_updates(role_obj.name, res.get("updates"))
        logger.log_reflection(
            round_num,
            role_obj.name,
            res.get("thought", ""),
            players.get_impressions(role_obj.name, alive_only=True),
        )
        knowledge_text = res.get("knowledge", "")
        players.update_knowledge(role_obj.name, knowledge_text)
        knowledge_store.update_player_knowledge(role_obj.name, knowledge_text)

    # 持久化最新知识以便异常时不丢失（集中写入减少磁盘开销）
    knowledge_store.save()


async def werewolves_game(
    agents: list[ReActAgent],
    knowledge_store: PlayerKnowledgeStore | None = None,
    player_model_map: dict[str, str] | None = None,
    game_id: str | None = None,
    event_sink: Any | None = None,
    stop_event: Any | None = None,
) -> tuple[str, str]:
    """狼人杀游戏的主入口

    Args:
        agents (`list[ReActAgent]`):
            9个智能体的列表。

    Returns:
        tuple[str, str]: (log_file_path, experience_file_path)
    """
    assert len(agents) == 9, "The werewolf game needs exactly 9 players."

    # 知识库初始化：首次加载，以确保后续回合/局可以复用经验
    knowledge_store = knowledge_store or PlayerKnowledgeStore(
        checkpoint_dir=config.experience_dir,
        base_filename=config.experience_id,
    )
    knowledge_store.load()

    # 初始化游戏日志
    gid = game_id or datetime.now().strftime("%Y%m%d_%H%M%S")
    logger = GameLogger(gid, event_sink=event_sink)

    # 记录可公开的投票历史，供后续回合参考
    vote_history: list[dict[str, Any]] = []

    # 初始化玩家状态
    players = Players()

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

        initial_knowledge = knowledge_store.get_player_knowledge(agent.name)
        players.add_player(agent, role_name, role_obj,
                           knowledge=initial_knowledge)

    # 打印角色信息
    players.print_roles()

    # 记录玩家列表到日志
    players_info = [(name, role)
                    for name, role in players.name_to_role.items()]
    logger.log_players(players_info, model_map=player_model_map)

    game_status = "正常结束"

    def _check_stop() -> None:
        """检查是否收到终止信号，若收到则抛出 CancelledError 以中断游戏。"""
        if stop_event is not None and getattr(stop_event, "is_set", None):
            try:
                if stop_event.is_set():
                    raise asyncio.CancelledError("游戏被用户终止")
            except asyncio.CancelledError:
                raise
            except Exception:
                return

    async def _check_stop_async() -> None:
        """异步版本的停止检查，可在 await 点使用。"""
        _check_stop()
        await asyncio.sleep(0)  # 让出控制权，允许其他任务运行

    try:
        # 游戏开始！
        for round_num in range(1, MAX_GAME_ROUND + 1):
            _check_stop()
            is_first_night = round_num == 1
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
                _check_stop()
                await alive_players_hub.broadcast(
                    await moderator(Prompts.to_all_night),
                )
                killed_player, poisoned_player, shot_player = None, None, None

                # 狼人讨论
                werewolf_agents = [w.agent for w in players.werewolves]
                async with MsgHub(
                    werewolf_agents,
                    enable_auto_broadcast=False,
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
                        _check_stop()
                        werewolf = players.werewolves[_ % n_werewolves]
                        context = _format_impression_context(
                            werewolf.name,
                            players,
                            vote_history,
                            round_public_records,
                            round_num,
                            "夜晚讨论",
                        )
                        res = await werewolf.discuss_with_team(
                            _attach_context(
                                await moderator(
                                    f"""当前处于夜晚狼人讨论阶段（狼人讨论第{_}轮）。
                                    狼人讨论结束后，是女巫做出决策阶段和预言家预言，之后才会结束夜晚阶段并公布夜间信息。
                                    """,
                                ),
                                context,
                            ),
                        )
                        # 记录狼人讨论
                        speech, behavior, thought, content_raw = _extract_msg_fields(
                            res)
                        # 仅狼人可见的夜聊记录，供后续上下文使用
                        round_public_records.append(
                            {
                                "player": werewolf.name,
                                "speech": speech or content_raw,
                                "behavior": behavior,
                                "phase": "狼人夜聊",
                                "scope": "wolves_only",
                            },
                        )
                        # 手动广播去隐私的消息，避免 thought 外泄
                        await werewolves_hub.broadcast(
                            _make_public_msg(
                                res, speech, behavior, content_raw),
                        )
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
                wolf_votes_for_majority: list[str | None] = []
                for werewolf in players.werewolves:
                    _check_stop()
                    context = _format_impression_context(
                        werewolf.name,
                        players,
                        vote_history,
                        round_public_records,
                        round_num,
                        "夜晚投票",
                    )
                    msg = await werewolf.team_vote(
                        _attach_context(vote_prompt, context),
                        players.current_alive,
                    )
                    if not msg:
                        wolf_votes_for_majority.append(None)
                        logger.log_message_detail(
                            "狼人投票",
                            werewolf.name,
                            speech="",
                            behavior="",
                            thought="",
                            action="未返回消息(计为空票)",
                        )
                        continue

                    speech, behavior, thought, content_raw = _extract_msg_fields(
                        msg)
                    # 记录狼人投票（狼必选目标，不允许弃权）
                    raw_vote = getattr(msg, "metadata", {}) or {}
                    raw_vote = raw_vote.get("vote")
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

                killed_player, votes, _wolf_top_candidates = majority_vote(
                    wolf_votes_for_majority,
                )
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
                    await moderator(wolves_res_prompt),
                )

            night_hunter_candidates: list[Hunter] = []

            # 女巫回合
            _check_stop()
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
                        vote_history,
                        round_public_records,
                        round_num,
                        "女巫行动",
                    ),
                }

                result = await witch.night_action(game_state)

                # 记录女巫“解药”阶段的结构化输出
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

                # 记录女巫“毒药”阶段的结构化输出
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

            # 夜晚若有猎人被狼刀（且未被毒/未被解药救活），记录到候选列表
            night_hunter_candidates: list[Hunter] = [
                hunter for hunter in players.hunter
                if killed_player == hunter.name and poisoned_player != hunter.name
            ]

            # 预言家回合
            _check_stop()
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
                        vote_history,
                        round_public_records,
                        round_num,
                        "预言家行动",
                    ),
                }

                result = await seer.night_action(game_state)

                # 记录预言家行动的结构化输出（心声/表现/发言）
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

            # 白天阶段
            logger.start_day()

            # 天亮后、公布夜间淘汰前，处理夜晚被狼人击杀的猎人开枪（仅狼刀且未被毒）
            night_hunter_shots: list[str] = []
            if night_hunter_candidates:
                # 猎人应基于当前可行动玩家（排除已被狼刀/毒杀的目标）做选择
                death_set = {name for name in [
                    killed_player, poisoned_player] if name}
                for hunter in night_hunter_candidates:
                    alive_for_hunter = [
                        p for p in players.current_alive if p.name not in death_set]
                    if not alive_for_hunter:
                        continue
                    context = _format_impression_context(
                        hunter.name,
                        players,
                        vote_history,
                        round_public_records,
                        round_num,
                        "猎人开枪",
                    )
                    shoot_res = await hunter.shoot(
                        alive_for_hunter,
                        moderator,
                        context,
                    )
                    if not shoot_res:
                        continue

                    logger.log_message_detail(
                        "猎人开枪",
                        hunter.name,
                        speech=shoot_res.get("speech"),
                        behavior=shoot_res.get("behavior"),
                        thought=shoot_res.get("thought"),
                    )

                    target = shoot_res.get(
                        "target") if shoot_res.get("shoot") else None
                    if target:
                        night_hunter_shots.append(target)
                        logger.log_action(
                            "猎人开枪", f"猎人 {hunter.name} 开枪击杀了 {target}")
                        await alive_players_hub.broadcast(
                            await moderator(
                                Prompts.to_all_hunter_shoot.format(target),
                            ),
                        )

            dead_tonight_raw = [killed_player,
                                poisoned_player, *night_hunter_shots]
            # 去重保持顺序，避免重复公告
            dead_tonight: list[str] = []
            for p in dead_tonight_raw:
                if p and p not in dead_tonight:
                    dead_tonight.append(p)

            # 记录夜晚死亡
            logger.log_death("夜晚死亡", dead_tonight)
            players.update_players(dead_tonight)

            night_deaths = dead_tonight
            if night_deaths:
                announcement = f"天亮了，请所有玩家睁眼。昨晚 {names_to_str(night_deaths)} 被淘汰。"
                logger.log_announcement(announcement)
                await alive_players_hub.broadcast(
                    await moderator(
                        Prompts.to_all_day.format(
                            names_to_str(night_deaths),
                        ),
                    ),
                )

                if is_first_night:
                    night_last_words = [killed_player, poisoned_player]
                    await _process_last_words(
                        night_last_words,
                        players,
                        vote_history,
                        round_public_records,
                        round_num,
                        alive_players_hub,
                        logger,
                        moderator,
                    )

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
                break

            # 讨论
            _check_stop()
            await alive_players_hub.broadcast(
                await moderator(
                    Prompts.to_all_discuss.format(
                        names=names_to_str(players.current_alive),
                    ),
                ),
            )
            # 更新存活智能体列表
            current_alive_agents = [
                role.agent for role in players.current_alive]

            # 使用 sequential_pipeline 进行讨论，并记录每个玩家的发言
            discussion_msgs = []
            for role in players.current_alive:
                _check_stop()
                context = _format_impression_context(
                    role.name,
                    players,
                    vote_history,
                    round_public_records,
                    round_num,
                    "白天讨论",
                )
                msg = await role.day_discussion(
                    _attach_context(await moderator(""), context),
                )
                speech, behavior, thought, content_raw = _extract_msg_fields(
                    msg)
                # 手动广播去隐私的消息，避免 thought 外泄
                await alive_players_hub.broadcast(
                    _make_public_msg(msg, speech, behavior, content_raw),
                )
                discussion_msgs.append(msg)
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

            # 投票
            _check_stop()
            vote_prompt = await moderator(
                Prompts.to_all_vote.format(
                    names_to_str(players.current_alive),
                ),
            )
            round_vote_records: list[dict[str, Any]] = []
            day_votes_for_majority: list[str | None] = []

            async def _vote_task(role_obj: Any) -> tuple[Any, Msg | None]:
                _check_stop()
                await asyncio.sleep(0.4)  # 控制并行调用节奏
                context = _format_impression_context(
                    role_obj.name,
                    players,
                    vote_history,
                    round_public_records,
                    round_num,
                    "白天投票",
                )
                msg = await role_obj.vote(
                    _attach_context(vote_prompt, context),
                    players.current_alive,
                )
                return role_obj, msg

            vote_results = await asyncio.gather(
                *(_vote_task(role) for role in players.current_alive),
            )

            for role_obj, msg in vote_results:
                if not msg:
                    speech = behavior = thought = content_raw = ""
                    raw_vote = None
                else:
                    speech, behavior, thought, content_raw = _extract_msg_fields(
                        msg)
                    raw_vote = getattr(msg, "metadata", {}) or {}
                    raw_vote = raw_vote.get("vote")
                # 记录投票
                abstained = is_abstain_vote(raw_vote)
                vote_value = None if abstained else str(raw_vote).strip()
                day_votes_for_majority.append(vote_value)

                if vote_value:
                    logger.log_vote(
                        role_obj.name,
                        vote_value,
                        "投票",
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought
                    )
                else:
                    logger.log_message_detail(
                        "投票",
                        role_obj.name,
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought,
                        action="弃票"
                    )

                round_vote_records.append(
                    {
                        "round": round_num,
                        "phase": "白天投票",
                        "voter": role_obj.name,
                        "target": vote_value,
                    },
                )

            voted_player, votes, top_candidates = majority_vote(
                day_votes_for_majority,
            )
            pk_round = 0
            pk_vote_records: list[dict[str, Any]] = []
            pk_max_rounds = 3  # 安全上限，避免极端情况下无限循环

            while top_candidates and len(top_candidates) > 1:
                pk_round += 1
                pk_candidates = top_candidates

                # 广播 PK 发言轮次
                await alive_players_hub.broadcast(
                    await moderator(
                        Prompts.to_all_pk_speech.format(
                            names_to_str(pk_candidates),
                            pk_round,
                        ),
                    ),
                )

                # 平票玩家依次再发言一次
                for candidate_name in pk_candidates:
                    role_obj = players.name_to_role_obj.get(candidate_name)
                    if not role_obj or not role_obj.is_alive:
                        continue
                    context = _format_impression_context(
                        candidate_name,
                        players,
                        vote_history,
                        round_public_records,
                        round_num,
                        f"PK发言#{pk_round}",
                    )
                    msg = await role_obj.day_discussion(
                        _attach_context(await moderator(""), context),
                    )
                    if msg:
                        speech, behavior, thought, content_raw = _extract_msg_fields(
                            msg)
                        await alive_players_hub.broadcast(
                            _make_public_msg(
                                msg, speech, behavior, content_raw),
                        )
                    else:
                        speech = behavior = thought = content_raw = ""
                    logger.log_message_detail(
                        "PK发言",
                        candidate_name,
                        speech=speech or content_raw,
                        behavior=behavior,
                        thought=thought,
                        action=f"第{pk_round}轮",
                    )
                    round_public_records.append(
                        {
                            "player": candidate_name,
                            "speech": speech or content_raw,
                            "behavior": behavior,
                            "phase": f"PK发言#{pk_round}",
                        },
                    )

                # PK 投票（仅在平票玩家中选择，不允许弃权）
                pk_vote_prompt = await moderator(
                    Prompts.to_all_pk_vote.format(
                        names_to_str(pk_candidates),
                    ),
                )
                pk_vote_targets = [
                    players.name_to_role_obj[name]
                    for name in pk_candidates
                    if name in players.name_to_role_obj
                ]

                async def _pk_vote_task(role_obj: Any) -> tuple[Any, Msg | None]:
                    await asyncio.sleep(0.4)  # 控制并行调用节奏
                    context = _format_impression_context(
                        role_obj.name,
                        players,
                        vote_history,
                        round_public_records,
                        round_num,
                        f"PK投票#{pk_round}",
                    )
                    vote_msg = await role_obj.agent(
                        _attach_context(pk_vote_prompt, context),
                        structured_model=get_vote_model(
                            pk_vote_targets,
                            allow_abstain=False,
                        ),
                    )
                    return role_obj, vote_msg

                pk_votes_for_majority: list[str | None] = []
                pk_vote_results = await asyncio.gather(
                    *(_pk_vote_task(role) for role in players.current_alive),
                )

                for role_obj, vote_msg in pk_vote_results:
                    if vote_msg:
                        speech, behavior, thought, content_raw = _extract_msg_fields(
                            vote_msg)
                        raw_vote_meta = getattr(vote_msg, "metadata", {}) or {}
                        vote_choice = raw_vote_meta.get("vote")
                        vote_value = str(vote_choice).strip(
                        ) if vote_choice else None
                    else:
                        speech = behavior = thought = content_raw = ""
                        vote_value = None
                    pk_votes_for_majority.append(vote_value)

                    if vote_value:
                        logger.log_vote(
                            role_obj.name,
                            vote_value,
                            f"PK投票#{pk_round}",
                            speech=speech or content_raw,
                            behavior=behavior,
                            thought=thought,
                        )
                    else:
                        logger.log_message_detail(
                            "PK投票",
                            role_obj.name,
                            speech=speech or content_raw,
                            behavior=behavior,
                            thought=thought,
                            action=f"第{pk_round}轮弃权/无效票",
                        )

                    pk_vote_records.append(
                        {
                            "round": round_num,
                            "phase": f"PK投票#{pk_round}",
                            "voter": role_obj.name,
                            "target": vote_value,
                        },
                    )

                voted_player, votes, top_candidates = majority_vote(
                    pk_votes_for_majority,
                )

                if voted_player:
                    logger.log_vote_result(
                        voted_player,
                        votes,
                        f"PK投票结果#{pk_round}",
                        "被投出",
                    )
                else:
                    logger.log_vote_result(
                        "无人出局",
                        votes,
                        f"PK投票结果#{pk_round}",
                        "平票/无效",
                    )

                # 广播 PK 投票结果或继续 PK
                if voted_player:
                    await alive_players_hub.broadcast(
                        await moderator(
                            Prompts.to_all_pk_res.format(
                                pk_round,
                                votes,
                                voted_player,
                            ),
                        ),
                    )
                elif top_candidates:
                    await alive_players_hub.broadcast(
                        await moderator(
                            Prompts.to_all_pk_tie.format(
                                pk_round,
                                votes,
                                names_to_str(top_candidates),
                            ),
                        ),
                    )

                if voted_player:
                    break

                if pk_round >= pk_max_rounds and len(top_candidates) > 1:
                    # 防止极端情况无限 PK：按姓名排序决出
                    voted_player = sorted(top_candidates)[0]
                    votes = (
                        f"{votes}; 连续{pk_round}轮平票，按姓名顺位淘汰 {voted_player}"
                    )
                    logger.log_action(
                        "PK仲裁",
                        f"多轮平票后强制淘汰 {voted_player}",
                    )
                    await alive_players_hub.broadcast(
                        await moderator(
                            Prompts.to_all_pk_fallback.format(
                                votes,
                                voted_player,
                            ),
                        ),
                    )
                    break

            # 将 PK 期间的票型也纳入历史
            round_vote_records.extend(pk_vote_records)

            # 记录投票结果
            if voted_player:
                logger.log_vote_result(voted_player, votes, "投票结果", "被投出")
            else:
                logger.log_vote_result("无人出局", votes, "投票结果", "无人被投出")

            # 投票结束后公开当轮票型，供后续回合引用
            vote_history.extend(round_vote_records)

            # 一起广播投票消息以避免相互影响
            voting_res_prompt = (
                Prompts.to_all_res.format(votes, voted_player)
                if voted_player
                else Prompts.to_all_res_abstain.format(votes)
            )

            voting_res_msg = await moderator(voting_res_prompt)
            await alive_players_hub.broadcast(voting_res_msg)

            day_last_words = [voted_player] if voted_player else []
            if day_last_words:
                await _process_last_words(
                    day_last_words,
                    players,
                    vote_history,
                    round_public_records,
                    round_num,
                    alive_players_hub,
                    logger,
                    moderator,
                )

            # 如果被投出的玩家是猎人，他可以开枪带走一人
            shot_player = None
            for hunter in players.hunter:
                if voted_player == hunter.name:
                    context = _format_impression_context(
                        hunter.name,
                        players,
                        vote_history,
                        round_public_records,
                        round_num,
                        "猎人开枪",
                    )
                    shoot_res = await hunter.shoot(
                        players.current_alive,
                        moderator,
                        context,
                    )
                    if not shoot_res:
                        continue

                    logger.log_message_detail(
                        "猎人开枪",
                        hunter.name,
                        speech=shoot_res.get("speech"),
                        behavior=shoot_res.get("behavior"),
                        thought=shoot_res.get("thought"),
                    )

                    shot_player = shoot_res.get(
                        "target") if shoot_res.get("shoot") else None
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
            _check_stop()
            await _reflection_phase(
                players,
                vote_history,
                round_public_records,
                round_num,
                moderator,
                logger,
                knowledge_store,
                stop_event,
            )

            # 记录回合结束时的存活玩家名单，便于回溯局势
            logger.log_alive_players(
                round_num,
                [role.name for role in players.current_alive],
            )

            # 检查胜利条件
            res = players.check_winning()
            if res:
                logger.log_announcement(f"游戏结束: {res}")
                async with MsgHub(players.all_players) as all_players_hub:
                    res_msg = await moderator(res)
                    await all_players_hub.broadcast(res_msg)
                break

        # 游戏结束，每位玩家发表感言
        final_prompt = await moderator(Prompts.to_all_reflect)
        for role in players.all_roles:
            context = _format_impression_context(
                role.name,
                players,
                vote_history,
                [],
                round_num,
                "游戏总结",
            )
            await role.agent(
                _attach_context(final_prompt, context),
            )

        # 持久化本局累计的知识
        knowledge_store.bulk_update(players.export_all_knowledge())
        knowledge_store.save()

        return str(logger.log_file), str(knowledge_store.path)

    except BaseException as exc:  # pylint: disable=broad-except
        game_status = "异常终止"
        logger.log_announcement(f"游戏异常终止: {exc}")
        raise
    finally:
        # 确保日志文件关闭并标记状态
        logger.close(status=game_status)
