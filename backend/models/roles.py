# -*- coding: utf-8 -*-
"""角色类定义模块 - 每个角色都有独立的行为逻辑"""
from typing import Optional, List
from abc import ABC, abstractmethod

from agentscope.agent import ReActAgent
from agentscope.message import Msg

from prompts.role_prompts import RolePrompts
from models.schemas import (
    BaseDecision,
    DiscussionModel,
    get_vote_model,
    get_poison_model,
    WitchResurrectModel,
    get_seer_model,
    get_hunter_model,
)


class BaseRole(ABC):
    """角色基类"""

    def __init__(self, agent: ReActAgent, role_name: str):
        self.agent = agent
        self.role_name = role_name
        self.is_alive = True

    @property
    def name(self) -> str:
        """获取玩家名称"""
        return self.agent.name

    @abstractmethod
    async def night_action(self, game_state: dict) -> dict:
        """夜晚行动 - 每个角色需要实现自己的夜晚行为"""
        pass

    async def day_discussion(self, prompt: Msg, context: str | None = None) -> Msg:
        """白天讨论 - 所有角色共用"""
        if context:
            prompt = Msg(
                prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)
        return await self.agent(
            prompt,
            structured_model=BaseDecision,
        )

    async def vote(
        self,
        prompt: Msg,
        alive_players: list,
        context: str | None = None,
    ) -> Msg:
        """投票 - 所有角色共用"""
        if context:
            prompt = Msg(
                prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)
        return await self.agent(
            prompt,
            structured_model=get_vote_model(alive_players),
        )

    async def observe(self, msg: Msg) -> None:
        """观察消息"""
        await self.agent.observe(msg)

    def kill(self) -> None:
        """标记角色死亡"""
        self.is_alive = False

    def get_instruction(self) -> str:
        """获取角色专属提示词"""
        prompts = {
            "werewolf": RolePrompts.werewolf_instruction,
            "villager": RolePrompts.villager_instruction,
            "seer": RolePrompts.seer_instruction,
            "witch": RolePrompts.witch_instruction,
            "hunter": RolePrompts.hunter_instruction,
        }
        return prompts.get(self.role_name, "")

    async def leave_last_words(self, prompt: Msg) -> Msg:
        """发表遗言"""
        return await self.agent(
            prompt,
            structured_model=BaseDecision,
        )


class Werewolf(BaseRole):
    """狼人角色"""

    def __init__(self, agent: ReActAgent):
        super().__init__(agent, "werewolf")

    async def night_action(self, game_state: dict) -> dict:
        """狼人夜晚行动 - 返回空字典，因为狼人的行动在团队讨论中完成"""
        return {}

    async def discuss_with_team(self, prompt: Msg, context: str | None = None) -> Msg:
        """狼人团队讨论"""
        if context:
            prompt = Msg(
                prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)
        return await self.agent(
            prompt,
            structured_model=DiscussionModel,
        )

    async def team_vote(
        self,
        prompt: Msg,
        alive_players: list,
        context: str | None = None,
    ) -> Msg:
        """狼人团队投票选择击杀目标"""
        if context:
            prompt = Msg(
                prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)
        return await self.agent(
            prompt,
            structured_model=get_vote_model(alive_players),
        )


class Villager(BaseRole):
    """村民角色"""

    def __init__(self, agent: ReActAgent):
        super().__init__(agent, "villager")

    async def night_action(self, game_state: dict) -> dict:
        """村民夜晚无行动"""
        return {}


class Seer(BaseRole):
    """预言家角色"""

    def __init__(self, agent: ReActAgent):
        super().__init__(agent, "seer")
        self.checked_players = []  # 记录已查验的玩家
        self.known_identities = {}  # 记录已知身份

    async def night_action(self, game_state: dict) -> dict:
        """预言家夜晚查验"""
        alive_players = game_state.get("alive_players", [])
        moderator = game_state.get("moderator")
        context = game_state.get("context")

        # 询问预言家要查验谁
        prompt = await moderator(
            f"[{self.name} ONLY] {self.name}，你是预言家。"
            f"请选择一名玩家查验身份。当前存活玩家：{', '.join([p.name for p in alive_players])}"
        )

        if context:
            prompt = Msg(
                prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)

        msg_seer = await self.agent(
            prompt,
            structured_model=get_seer_model(alive_players),
        )

        result = {
            "speech": msg_seer.metadata.get("speech"),
            "behavior": msg_seer.metadata.get("behavior"),
            "thought": msg_seer.metadata.get("thought"),
        }

        checked_name = msg_seer.metadata.get("name")
        if checked_name:
            self.checked_players.append(checked_name)
            # 获取真实身份
            role = game_state.get("name_to_role", {}).get(checked_name)
            self.known_identities[checked_name] = role

            # 告知预言家结果
            result_msg = await moderator(
                f"[{self.name} ONLY] {checked_name} 的身份是 {role}。"
            )
            await self.agent.observe(result_msg)

            result.update({
                "action": "check",
                "target": checked_name,
                "result": role,
            })
            return result

        return result


class Witch(BaseRole):
    """女巫角色"""

    def __init__(self, agent: ReActAgent):
        super().__init__(agent, "witch")
        self.has_healing = True  # 是否还有解药
        self.has_poison = True   # 是否还有毒药

    async def night_action(self, game_state: dict) -> dict:
        """女巫夜晚行动"""
        killed_player = game_state.get("killed_player")
        alive_players = game_state.get("alive_players", [])
        moderator = game_state.get("moderator")
        context = game_state.get("context")

        result = {}

        # 解药环节
        if self.has_healing and killed_player and killed_player != self.name:
            prompt = await moderator(
                f"[{self.name} ONLY] {self.name}，你是女巫。"
                f"今晚 {killed_player} 被狼人杀死了。你要使用解药救他/她吗？"
            )

            if context:
                prompt = Msg(
                    prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)

            msg_resurrect = await self.agent(
                prompt,
                structured_model=WitchResurrectModel,
            )

            result["resurrect_speech"] = msg_resurrect.metadata.get("speech")
            result["resurrect_behavior"] = msg_resurrect.metadata.get(
                "behavior")
            result["resurrect_thought"] = msg_resurrect.metadata.get("thought")

            if msg_resurrect.metadata.get("resurrect"):
                self.has_healing = False
                result["resurrect"] = killed_player

        # 毒药环节（如果本回合没有使用解药）
        if self.has_poison and not result.get("resurrect"):
            prompt = await moderator(
                f"[{self.name} ONLY] {self.name}，你要使用毒药吗？"
                f"当前存活玩家：{', '.join([p.name for p in alive_players])}"
            )

            if context:
                prompt = Msg(
                    prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)

            msg_poison = await self.agent(
                prompt,
                structured_model=get_poison_model(alive_players),
            )

            result["poison_speech"] = msg_poison.metadata.get("speech")
            result["poison_behavior"] = msg_poison.metadata.get("behavior")
            result["poison_thought"] = msg_poison.metadata.get("thought")

            if msg_poison.metadata.get("poison"):
                poisoned_name = msg_poison.metadata.get("name")
                if poisoned_name:
                    self.has_poison = False
                    result["poison"] = poisoned_name

        return result


class Hunter(BaseRole):
    """猎人角色"""

    def __init__(self, agent: ReActAgent):
        super().__init__(agent, "hunter")
        self.has_shot = True  # 是否还有开枪机会

    async def night_action(self, game_state: dict) -> dict:
        """猎人夜晚行动（被杀时可能触发）"""
        return {}

    async def shoot(self, alive_players: list, moderator, context: str | None = None) -> Optional[dict]:
        """猎人开枪带走一人，返回包含目标与思考的字典。"""
        if not self.has_shot:
            return None

        prompt = await moderator(
            f"[{self.name} ONLY] {self.name}，你是猎人，即将死亡。"
            f"你要开枪带走一人吗？当前存活玩家：{', '.join([p.name for p in alive_players])}"
        )

        if context:
            prompt = Msg(
                prompt.name, f"{prompt.content}\n\n{context}", role=prompt.role)

        msg_hunter = await self.agent(
            prompt,
            structured_model=get_hunter_model(alive_players),
        )

        if msg_hunter.metadata.get("shoot"):
            self.has_shot = False
            return {
                "target": msg_hunter.metadata.get("name"),
                "speech": msg_hunter.metadata.get("speech"),
                "behavior": msg_hunter.metadata.get("behavior"),
                "thought": msg_hunter.metadata.get("thought"),
            }

        return None


class RoleFactory:
    """角色工厂类 - 用于创建角色实例"""

    @staticmethod
    def create_role(agent: ReActAgent, role_name: str) -> BaseRole:
        """根据角色名称创建对应的角色实例"""
        role_map = {
            "werewolf": Werewolf,
            "villager": Villager,
            "seer": Seer,
            "witch": Witch,
            "hunter": Hunter,
        }

        role_class = role_map.get(role_name)
        if not role_class:
            raise ValueError(f"未知角色类型: {role_name}")

        return role_class(agent)
