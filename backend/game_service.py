# -*- coding: utf-8 -*-
"""FastAPI 下运行 WolfMind 游戏的一些服务端辅助函数。"""

from __future__ import annotations

from dataclasses import dataclass

from agentscope.agent import ReActAgent

from config import config
from core.knowledge_base import PlayerKnowledgeStore
from core.game_engine import werewolves_game

# 复用 CLI 入口中的官方 prompt 与 agent 构造函数，
# 避免在这里重复维护一大段系统提示词。
from main import get_official_agents  # noqa: E402


@dataclass
class GameStartResult:
    game_id: str


def _model_label(provider: str, cfg: dict[str, str] | None) -> str:
    if provider == "openai" and cfg:
        return f"openai: {cfg.get('model_name', '')}"
    if provider == "dashscope":
        return f"dashscope: {config.dashscope_model_name}"
    if provider == "ollama":
        return f"ollama: {config.ollama_model_name}"
    return provider


def create_players() -> tuple[list[ReActAgent], dict[str, str]]:
    """创建 9 名玩家并返回 (agents, player_model_map)。"""

    model_overrides = (
        config.openai_player_configs if config.model_provider == "openai" else [
            None] * 9
    )

    agents = [
        get_official_agents(f"Player{idx + 1}", model_overrides[idx]) for idx in range(9)
    ]

    player_model_map = {
        player.name: _model_label(config.model_provider, model_overrides[idx])
        for idx, player in enumerate(agents)
    }

    return agents, player_model_map


def create_knowledge_store(player_model_map: dict[str, str]) -> PlayerKnowledgeStore:
    """为本局创建并落盘一个空的知识库（经验存档）。"""

    store = PlayerKnowledgeStore(
        checkpoint_dir=config.experience_dir,
        base_filename=config.experience_id,
    )
    store.set_player_models(player_model_map)
    store.save()
    return store


async def run_game_session(*, game_id: str, event_sink=None) -> tuple[str, str]:
    """运行完整的一局游戏并返回 (log_path, experience_path)。"""

    is_valid, error_msg = config.validate()
    if not is_valid:
        raise RuntimeError(f"配置错误: {error_msg}")

    agents, player_model_map = create_players()
    knowledge_store = create_knowledge_store(player_model_map)

    log_path, experience_path = await werewolves_game(
        agents,
        knowledge_store=knowledge_store,
        player_model_map=player_model_map,
        game_id=game_id,
        event_sink=event_sink,
    )

    return log_path, experience_path
