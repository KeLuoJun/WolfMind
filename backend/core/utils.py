# -*- coding: utf-8 -*-
"""狼人杀游戏的工具函数集合。"""
from collections import Counter, defaultdict
from typing import Any

try:
    from ..config import config  # type: ignore
except Exception:  # noqa: BLE001
    from config import config
from prompts import EnglishPrompts, ChinesePrompts

from agentscope.message import Msg
from agentscope.agent import ReActAgent, AgentBase

# 从配置文件读取游戏参数
MAX_GAME_ROUND = config.max_game_round  # 最大回合数
MAX_DISCUSSION_ROUND = config.max_discussion_round  # 白天讨论阶段的最大讨论轮数

# 根据配置选择提示词语言
Prompts = ChinesePrompts

ABSTAIN_KEYWORDS = {
    "abstain",
    "弃权",
    "skip",
    "pass",
    "no vote",
    "novote",
    "none",
    "",
}


def is_abstain_vote(vote: Any) -> bool:
    """判断投票是否为弃权/无效。"""

    if vote is None:
        return True

    vote_str = str(vote).strip()
    return vote_str.lower() in ABSTAIN_KEYWORDS


def majority_vote(votes: list[str | None]) -> tuple[str | None, str, list[str]]:
    """在剔除弃权/无效票后返回最高票玩家、计票详情与最高票候选人列表。"""

    if not votes:
        return None, "无人投票", []

    counter: Counter[str] = Counter()
    abstain_count = 0

    for vote in votes:
        if is_abstain_vote(vote):
            abstain_count += 1
            continue
        vote_str = str(vote).strip()
        counter[vote_str] += 1

    parts = [f"{name}: {count}" for name, count in counter.items()]
    if abstain_count:
        parts.append(f"弃权/无效: {abstain_count}")
    conditions = ", ".join(parts) if parts else "全员弃权/无效票"

    if not counter:
        return None, conditions, []

    max_votes = max(counter.values())
    top_candidates = [name for name, count in counter.items()
                      if count == max_votes]

    # 只有唯一最高票时直接返回该玩家，否则返回 None 并携带平票候选列表
    result = top_candidates[0] if len(top_candidates) == 1 else None
    return result, conditions, top_candidates


def names_to_str(agents: list[str] | list[ReActAgent] | list) -> str:
    """将玩家/角色列表转换为名字字符串。

    Args:
        agents: 可以是字符串列表、智能体列表或角色对象列表
    """
    if not agents:
        return ""

    if len(agents) == 1:
        item = agents[0]
        if isinstance(item, str):
            return item
        elif isinstance(item, ReActAgent):
            return item.name
        elif hasattr(item, 'name'):  # 角色对象
            return item.name
        else:
            return str(item)

    names = []
    for agent in agents:
        if isinstance(agent, str):
            names.append(agent)
        elif isinstance(agent, ReActAgent):
            names.append(agent.name)
        elif hasattr(agent, 'name'):  # 角色对象
            names.append(agent.name)
        else:
            names.append(str(agent))

    return ", ".join([*names[:-1], "and " + names[-1]])


class EchoAgent(AgentBase):
    """复读主持人代理，直接返回收到的消息。"""

    def __init__(self) -> None:
        super().__init__()
        self.name = "Moderator"

    async def reply(self, content: str) -> Msg:
        """将收到的内容原样返回。"""
        msg = Msg(
            self.name,
            content,
            role="assistant",
        )
        # 禁用打印以避免重复输出（日志已记录所有内容）
        # await self.print(msg)
        return msg

    async def handle_interrupt(
        self,
        *args: Any,
        **kwargs: Any,
    ) -> Msg:
        """处理打断，返回空消息。"""
        return Msg(
            self.name,
            "",
            role="assistant",
        )

    async def observe(self, msg: Msg | list[Msg] | None) -> None:
        """观察消息（占位，无额外逻辑）。"""


class Players:
    """维护玩家状态的容器。"""

    def __init__(self) -> None:
        """初始化玩家管理结构。"""
        # The mapping from player name to role
        self.name_to_role = {}  # 玩家名称到角色字符串的映射
        self.role_to_names = defaultdict(list)  # 角色到玩家名称列表的映射
        self.name_to_agent = {}  # 玩家名称到智能体的映射
        self.name_to_role_obj = {}  # 玩家名称到角色对象的映射 (新增)
        self.werewolves = []  # 狼人角色对象列表
        self.villagers = []  # 村民角色对象列表
        self.seer = []  # 预言家角色对象列表
        self.hunter = []  # 猎人角色对象列表
        self.witch = []  # 女巫角色对象列表
        self.current_alive = []  # 当前存活角色对象列表
        self.all_players = []  # 所有智能体列表
        self.all_roles = []  # 所有角色对象列表 (新增)
        self.impressions = {}  # 玩家对其他玩家的印象映射: {player: {other: impression}}
        self.knowledge = {}  # 玩家持久化的游戏理解: {player: knowledge_text}

    def add_player(self, player: ReActAgent, role: str, role_obj=None, knowledge: str | None = None) -> None:
        """将一名玩家加入游戏。

        Args:
            player (`ReActAgent`): 要加入的智能体
            role (`str`): 该玩家的角色名
            role_obj: 角色对象实例（可选）
            knowledge: 该玩家的长期知识文本（可选）
        """
        self.name_to_role[player.name] = role
        self.name_to_agent[player.name] = player
        self.role_to_names[role].append(player.name)
        self.all_players.append(player)

        # 初始化印象: 所有玩家彼此为“不熟悉”
        for existing in self.impressions:
            self.impressions[existing][player.name] = "不熟悉"
        self.impressions[player.name] = {
            name: "不熟悉" for name in self.name_to_agent.keys() if name != player.name
        }

        # 初始化知识库文本
        self.knowledge[player.name] = knowledge or ""

        if role_obj:
            self.name_to_role_obj[player.name] = role_obj
            self.all_roles.append(role_obj)

        if role == "werewolf":
            self.werewolves.append(role_obj if role_obj else player)
        elif role == "villager":
            self.villagers.append(role_obj if role_obj else player)
        elif role == "seer":
            self.seer.append(role_obj if role_obj else player)
        elif role == "hunter":
            self.hunter.append(role_obj if role_obj else player)
        elif role == "witch":
            self.witch.append(role_obj if role_obj else player)
        else:
            raise ValueError(f"Unknown role: {role}")
        self.current_alive.append(role_obj if role_obj else player)

    def get_knowledge(self, player_name: str) -> str:
        """返回指定玩家的长期游戏理解文本。"""
        return self.knowledge.get(player_name, "")

    def update_knowledge(self, player_name: str, knowledge: str) -> None:
        """更新某个玩家的长期游戏理解文本。"""
        self.knowledge[player_name] = knowledge or ""

    def is_werewolf(self, player_name: str) -> bool:
        """判断玩家是否为狼人（无论存活与否）。"""
        return self.name_to_role.get(player_name) == "werewolf"

    def get_werewolf_team_status(self) -> list[tuple[str, bool]]:
        """返回所有狼人及其存活状态列表。"""
        wolves = self.role_to_names.get("werewolf", [])
        alive_names = {role.name for role in self.current_alive}
        return [(name, name in alive_names) for name in wolves]

    def export_all_knowledge(self) -> dict[str, str]:
        """返回所有玩家知识条目的浅拷贝。"""
        return dict(self.knowledge)

    def update_players(self, dead_players: list[str]) -> None:
        """根据死亡名单更新存活玩家列表。"""
        # 标记角色对象为死亡
        for name in dead_players:
            if name and name in self.name_to_role_obj:
                self.name_to_role_obj[name].kill()

        # 更新存活列表
        self.werewolves = [
            _ for _ in self.werewolves if _.name not in dead_players
        ]
        self.villagers = [
            _ for _ in self.villagers if _.name not in dead_players
        ]
        self.seer = [_ for _ in self.seer if _.name not in dead_players]
        self.hunter = [_ for _ in self.hunter if _.name not in dead_players]
        self.witch = [_ for _ in self.witch if _.name not in dead_players]
        self.current_alive = [
            _ for _ in self.current_alive if _.name not in dead_players
        ]

    def get_impressions(self, player_name: str, alive_only: bool = True) -> dict[str, str]:
        """获取指定玩家的印象映射。

        Args:
            player_name: 玩家名称
            alive_only: 是否仅返回当前存活玩家
        """
        impression_map = self.impressions.get(player_name, {}).copy()
        if alive_only:
            alive_names = {
                _.name for _ in self.current_alive if _.name != player_name}
            impression_map = {
                name: imp for name, imp in impression_map.items() if name in alive_names
            }
        return impression_map

    def apply_impression_updates(self, player_name: str, updates: dict[str, str]) -> None:
        """为指定玩家应用印象更新。

        Args:
            player_name: 更新人
            updates: {other_player: impression}
        """
        if not updates:
            return
        if player_name not in self.impressions:
            return
        self.impressions[player_name].update(updates)

    def print_roles(self) -> None:
        """打印所有玩家的角色信息。"""
        print("Roles:")
        for name, role in self.name_to_role.items():
            print(f" - {name}: {role}")

    def check_winning(self) -> str | None:
        """检查胜负条件，满足则返回胜利文案。"""

        # Prepare true roles string
        true_roles = (
            f'{names_to_str(self.role_to_names["werewolf"])} are werewolves, '
            f'{names_to_str(self.role_to_names["villager"])} are villagers, '
            f'{names_to_str(self.role_to_names["seer"])} is the seer, '
            f'{names_to_str(self.role_to_names["hunter"])} is the hunter, '
            f'and {names_to_str(self.role_to_names["witch"])} is the witch.'
        )

        # 屠边规则：狼人存活且神职或平民一侧被清空即可胜利；好人胜利条件仍为清空所有狼人
        villagers_remaining = len(self.villagers)
        gods_remaining = len(self.seer) + len(self.hunter) + len(self.witch)

        if self.werewolves and (gods_remaining == 0 or villagers_remaining == 0):
            return Prompts.to_all_wolf_win.format(
                n_alive=len(self.current_alive),
                n_werewolves=len(self.werewolves),
                true_roles=true_roles,
            )

        if len(self.werewolves) * 2 >= len(self.current_alive):
            return Prompts.to_all_wolf_win.format(
                n_alive=len(self.current_alive),
                n_werewolves=len(self.werewolves),
                true_roles=true_roles,
            )

        if self.current_alive and not self.werewolves:
            return Prompts.to_all_village_win.format(
                true_roles=true_roles,
            )
        return None
