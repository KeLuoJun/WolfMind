# -*- coding: utf-8 -*-
"""轻量级的玩家长期知识“经验存档”管理。"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict


class PlayerKnowledgeStore:
    """管理每位玩家的长期游戏理解。

    每次程序启动都会创建一个全新的、带时间戳的经验存档文件，保证首局
    游戏从空白知识库开始。知识只保存可跨局复用的经验/理解，不包含任何
    一局的具体发言或投票细节。
    """

    def __init__(self, checkpoint_dir: str, base_filename: str) -> None:
        self.dir_path = Path(checkpoint_dir)
        self.dir_path.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_id = f"{base_filename}_{timestamp}"
        self.file_path = self.dir_path / f"{self.session_id}.json"

        # 以内存为主，保存时镜像到磁盘。
        self._data: Dict[str, object] = {
            "session_id": self.session_id,
            "created_at": datetime.now().isoformat(),
            "players": {},
            "player_models": {},
        }
        # 为当前运行创建一个独立的空文件。
        self.save()

    def load(self) -> Dict[str, object]:
        """从磁盘读取知识（若文件已有内容则覆盖到内存）。"""
        if self.file_path.exists():
            raw = self.file_path.read_text(encoding="utf-8")
            if raw.strip():
                try:
                    self._data = json.loads(raw)
                except json.JSONDecodeError:
                    # Keep current in-memory data if file is somehow broken.
                    pass
        return self._data

    def get_player_knowledge(self, name: str) -> str:
        """返回指定玩家的知识文本，无则返回空字符串。"""
        players = self._data.get("players", {}) if isinstance(
            self._data, dict) else {}
        return str(players.get(name, "")) if isinstance(players, dict) else ""

    def update_player_knowledge(self, name: str, knowledge: str) -> None:
        """更新某个玩家的知识文本（仅更新内存）。"""
        if not isinstance(self._data, dict):
            self._data = {"session_id": self.session_id, "players": {}}
        players = self._data.setdefault(
            "players", {})  # type: ignore[arg-type]
        if isinstance(players, dict):
            players[name] = knowledge or ""

    def set_player_models(self, model_map: Dict[str, str]) -> None:
        """记录玩家对应的模型信息（字符串将直接写入经验文件）。"""

        if not isinstance(self._data, dict):
            self._data = {"session_id": self.session_id, "players": {}}
        self._data["player_models"] = {
            name: f"({model})" for name, model in model_map.items()
        }

    def bulk_update(self, knowledge_map: Dict[str, str]) -> None:
        """批量替换或合并多名玩家的知识条目。"""
        for name, knowledge in knowledge_map.items():
            self.update_player_knowledge(name, knowledge)

    def export_players(self) -> Dict[str, str]:
        """返回玩家知识映射的浅拷贝。"""
        players = self._data.get("players", {}) if isinstance(
            self._data, dict) else {}
        return dict(players) if isinstance(players, dict) else {}

    def save(self) -> None:
        """将当前知识持久化为 JSON 写入磁盘。"""
        serialized = json.dumps(self._data, ensure_ascii=False, indent=2)
        self.file_path.write_text(serialized, encoding="utf-8")

    @property
    def path(self) -> str:
        """返回检查点文件路径字符串。"""
        return str(self.file_path)
