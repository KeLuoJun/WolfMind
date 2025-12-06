# -*- coding: utf-8 -*-
"""狼人杀游戏使用的结构化输出模型。"""
from typing import Literal

from pydantic import BaseModel, Field
from agentscope.agent import AgentBase


class BaseDecision(BaseModel):
    """所有决策的基类，包含思考过程和行为描述。"""

    thought: str = Field(
        description="你决策背后的思考过程。分析局势、其他玩家的行为以及你的策略。注：这是你的私密思考过程，不会被其他玩家看到。",
    )
    behavior: str = Field(
        description="一段没有主语的行为/表情/发言等描写，表示你发言时的表现。你的表现会被其他玩家观察和分析，你可以自由选择策略，是否说话/伪装/挑衅/挑拨离间等等。不要包含你的名字。",
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
            "为了提高你在心理博弈中的优势，你需要对其他玩家有充分的了解。\n"
            "请根据你此前的了解和刚刚一局比赛中的表现，更新对它的全面印象。请尽你所能洞察它的动机、性格、策略、弱点等等。"
            "你只需输出一小段完整清晰的分析结果和印象，无需其他额外的解释说明。键为玩家名，值为印象。注：仅填写需要更新的玩家。"
        ),
        default_factory=dict,
    )


class DiscussionModel(BaseDecision):
    """讨论阶段的输出模型。"""

    reach_agreement: bool = Field(
        description="是否达成了共识",
    )


def get_vote_model(agents: list[AgentBase]) -> type[BaseModel]:
    """根据玩家名字生成投票模型。"""

    class VoteModel(BaseDecision):
        """投票阶段的输出模型。"""

        vote: Literal[tuple(_.name for _ in agents)] = Field(  # type: ignore
            description="你想投票的玩家名字",
        )

    return VoteModel


class WitchResurrectModel(BaseDecision):
    """女巫使用解药时的输出模型。"""

    resurrect: bool = Field(
        description="是否想要复活该玩家",
    )


def get_poison_model(agents: list[AgentBase]) -> type[BaseModel]:
    """根据玩家名字生成毒药模型。"""

    class WitchPoisonModel(BaseDecision):
        """女巫使用毒药时的输出模型。"""

        poison: bool = Field(
            description="是否想要使用毒药",
        )
        name: Literal[tuple(_.name for _ in agents)] | None = Field(  # type: ignore
            description="你想毒杀的玩家名字，如果你不想毒杀任何人，请留空",
            default=None,
        )

    return WitchPoisonModel


def get_seer_model(agents: list[AgentBase]) -> type[BaseModel]:
    """根据玩家名字生成预言家模型。"""

    class SeerModel(BaseDecision):
        """预言家行动的输出模型。"""

        name: Literal[tuple(_.name for _ in agents)] = Field(  # type: ignore
            description="你想查验身份的玩家名字",
        )

    return SeerModel


def get_hunter_model(agents: list[AgentBase]) -> type[BaseModel]:
    """根据玩家生成猎人模型。"""

    class HunterModel(BaseDecision):
        """猎人行动的输出模型。"""

        shoot: bool = Field(
            description="是否想要使用开枪能力",
        )
        name: Literal[tuple(_.name for _ in agents)] | None = Field(  # type: ignore
            description="你想射杀的玩家名字，如果你不想使用能力，请留空",
            default=None,
        )

    return HunterModel
