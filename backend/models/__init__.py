# -*- coding: utf-8 -*-
"""数据模型与角色定义。"""

try:
    # 以包方式运行：import backend.models
    from .roles import BaseRole, Werewolf, Villager, Seer, Witch, Hunter, RoleFactory  # type: ignore
    from .schemas import (  # type: ignore
        BaseDecision,
        DiscussionModel,
        ReflectionModel,
        KnowledgeUpdateModel,
        WitchResurrectModel,
        get_vote_model,
        get_poison_model,
        get_seer_model,
        get_hunter_model,
    )
except Exception:  # noqa: BLE001
    # 以 backend 目录为工作目录运行：import models
    from models.roles import BaseRole, Werewolf, Villager, Seer, Witch, Hunter, RoleFactory
    from models.schemas import (
        BaseDecision,
        DiscussionModel,
        ReflectionModel,
        KnowledgeUpdateModel,
        WitchResurrectModel,
        get_vote_model,
        get_poison_model,
        get_seer_model,
        get_hunter_model,
    )


__all__ = [
    "BaseRole",
    "Werewolf",
    "Villager",
    "Seer",
    "Witch",
    "Hunter",
    "RoleFactory",
    "BaseDecision",
    "DiscussionModel",
    "ReflectionModel",
    "KnowledgeUpdateModel",
    "WitchResurrectModel",
    "get_vote_model",
    "get_poison_model",
    "get_seer_model",
    "get_hunter_model",
]
