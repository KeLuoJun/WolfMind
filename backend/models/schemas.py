# -*- coding: utf-8 -*-
"""The structured output models used in the werewolf game."""
from typing import Literal, Tuple

from pydantic import BaseModel, Field
from agentscope.agent import AgentBase


class BaseDecision(BaseModel):
    """所有决策的基类，包含思考过程和行为描述。"""
    thought: str = Field(
        description="你决策背后的思考过程。分析局势、其他玩家的行为以及你的策略。",
    )
    behavior: str = Field(
        description="一段没有主语的行为、表情或动作描写（例如：'深深地皱起了眉头'，'赞同地点了点头'，'紧张地四处张望'）。不要包含你的名字。",
    )
    speech: str = Field(
        description="你对其他玩家的最终发言或陈述。这是其他玩家会听到的内容。",
    )


class ReflectionModel(BaseModel):
    """存活玩家在每轮结束后的反思与印象更新。"""

    thought: str = Field(
        description="你的私密思考过程，不会被其他玩家看到。",
    )
    impression_updates: dict[str, str] = Field(
        description=(
            "你对其他存活玩家更新后的印象，键为玩家名，值为简短印象，例如"
            " '不熟悉'、'可信'、'可疑'、'危险' 等。仅填写需要更新的玩家。"
        ),
        default_factory=dict,
    )


class DiscussionModel(BaseDecision):
    """The output format for discussion."""

    reach_agreement: bool = Field(
        description="是否达成了共识",
    )


def get_vote_model(agents: list[AgentBase]) -> type[BaseModel]:
    """Get the vote model by player names."""

    class VoteModel(BaseDecision):
        """The vote output format."""

        vote: Literal[tuple(_.name for _ in agents)] = Field(  # type: ignore
            description="你想投票的玩家名字",
        )

    return VoteModel


class WitchResurrectModel(BaseDecision):
    """The output format for witch resurrect action."""

    resurrect: bool = Field(
        description="是否想要复活该玩家",
    )


def get_poison_model(agents: list[AgentBase]) -> type[BaseModel]:
    """Get the poison model by player names."""

    class WitchPoisonModel(BaseDecision):
        """The output format for witch poison action."""

        poison: bool = Field(
            description="是否想要使用毒药",
        )
        name: Literal[  # type: ignore
            tuple(_.name for _ in agents)
        ] | None = Field(
            description="你想毒杀的玩家名字，如果你不想毒杀任何人，请留空",
            default=None,
        )

    return WitchPoisonModel


def get_seer_model(agents: list[AgentBase]) -> type[BaseModel]:
    """Get the seer model by player names."""

    class SeerModel(BaseDecision):
        """The output format for seer action."""

        name: Literal[tuple(_.name for _ in agents)] = Field(  # type: ignore
            description="你想查验身份的玩家名字",
        )

    return SeerModel


def get_hunter_model(agents: list[AgentBase]) -> type[BaseModel]:
    """Get the hunter model by player agents."""

    class HunterModel(BaseDecision):
        """The output format for hunter action."""

        shoot: bool = Field(
            description="是否想要使用开枪能力",
        )
        name: Literal[  # type: ignore
            tuple(_.name for _ in agents)
        ] | None = Field(
            description="你想射杀的玩家名字，如果你不想使用能力，请留空",
            default=None,
        )

    return HunterModel
