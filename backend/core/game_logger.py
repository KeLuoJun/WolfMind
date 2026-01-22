# -*- coding: utf-8 -*-
"""游戏日志记录模块"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional, Callable, Any

from config import config


class GameLogger:
    """狼人杀游戏日志记录器"""

    def __init__(
        self,
        game_id: str,
        log_dir: Optional[str] = None,
        event_sink: Callable[[dict[str, Any]], None] | None = None,
    ):
        """初始化日志记录器

        Args:
            game_id: 游戏ID（格式：YYYYMMDD_HHMMSS）
            log_dir: 日志文件存储目录（相对于 backend 目录）
        """
        self.game_id = game_id
        resolved_dir = Path(log_dir) if log_dir else Path(config.log_dir)
        self.log_dir = resolved_dir
        self.log_file = resolved_dir / f"game_{game_id}.log"
        self.current_round = 0
        self.start_time = datetime.now()
        self.closed = False  # 是否已关闭（避免重复 close）
        self._event_sink = event_sink

        # 确保日志目录存在
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # 初始化日志文件
        self._init_log_file()

    def _now_ms(self) -> int:
        return int(datetime.now().timestamp() * 1000)

    def _emit(self, event: dict[str, Any]) -> None:
        if not self._event_sink:
            return
        try:
            # 补充通用字段，便于前端统一展示/排序
            event.setdefault("gameId", self.game_id)
            event.setdefault("round", self.current_round)
            event.setdefault("timestamp", self._now_ms())
            event.setdefault("ts", event.get("timestamp"))
            self._event_sink(event)
        except Exception:
            # 任何推送异常都不应影响核心游戏流程/日志写入
            return

    def _init_log_file(self):
        """初始化日志文件头部信息"""
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("狼人杀游戏日志\n")
            f.write(f"游戏ID: {self.game_id}\n")
            f.write(f"开始时间: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n")

    def log_players(
        self,
        players_info: list[tuple[str, str]],
        model_map: dict[str, str] | None = None,
    ):
        """记录玩家列表，可选带上模型说明。

        Args:
            players_info: 玩家信息列表，每项为 (玩家名, 角色名)
            model_map: 可选的玩家模型映射，值将以括号展示
        """
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n玩家列表:\n")
            for name, role in players_info:
                model_label = f" ({model_map[name]})" if model_map and name in model_map else ""
                f.write(f"  - {name}{model_label}: {role}\n")
            f.write("\n" + "=" * 80 + "\n")

        # 同步推送一条系统事件给前端（用于初始化 UI）
        self._emit(
            {
                "type": "system",
                "content": "玩家列表已初始化",
                "players": [
                    {
                        "name": name,
                        "role": role,
                        "model": (model_map.get(name) if model_map else None),
                    }
                    for name, role in players_info
                ],
            }
        )

    def start_round(self, round_num: int):
        """开始新回合

        Args:
            round_num: 回合编号
        """
        self.current_round = round_num
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n第 {round_num} 回合\n")
            f.write("-" * 80 + "\n")

        self._emit(
            {
                "type": "round_start",
                "round": round_num,
                "content": f"第 {round_num} 回合",
            }
        )

    def start_night(self):
        """开始夜晚阶段"""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n【夜晚阶段】\n\n")

        self._emit({"type": "night_start", "content": "夜晚阶段开始"})

    def start_day(self):
        """开始白天阶段"""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n【白天阶段】\n\n")

        self._emit({"type": "day_start", "content": "白天阶段开始"})

    CATEGORY_MAP = {
        "狼人讨论": "🐺 狼人频道",
        "狼人投票": "🗡️ 狼人投票",
        "女巫行动": "💊 女巫行动",
        "女巫行动(解药)": "💊 女巫解药",
        "女巫行动(毒药)": "💊 女巫毒药",
        "预言家行动": "🔮 预言家行动",
        "预言家查验": "🔮 预言家行动",
        "猎人开枪": "🔫 猎人开枪",
        "白天讨论": "🗣️ 公开发言",
        "投票": "🗳️ 投票",
        "遗言": "👻 遗言",
        "公告": "📢 系统公告",
        "夜晚死亡": "💀 夜晚死亡",
        "白天死亡": "💀 白天死亡",
        "投票结果": "📊 投票结果",
        "狼人投票结果": "📊 狼人投票结果",
    }

    def _get_category_display(self, category: str) -> str:
        """获取类别的显示名称（带图标）"""
        return self.CATEGORY_MAP.get(category, f"📝 {category}")

    def log_message_detail(
        self,
        category: str,
        player_name: str,
        speech: Optional[str] = None,
        behavior: Optional[str] = None,
        thought: Optional[str] = None,
        action: Optional[str] = None,
    ):
        """记录包含思考/行为/发言/动作的消息。"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display(category)

        # 构建标题行
        header = f"[{timestamp}] {cat_display} | {player_name}"
        if action:
            header += f" -> {action}"

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"{header}\n")

            # 写入详细内容（带缩进，支持多行换行对齐）
            self._write_field(f, "心声", thought)
            self._write_field(f, "表现", behavior)
            self._write_field(f, "发言", speech)

            f.write("\n")  # 增加空行以分隔条目

        # 将结构化条目推送给前端
        content_lines: list[str] = []
        if thought:
            content_lines.append(f"(心声) {thought}")
        if behavior:
            content_lines.append(f"(表现) {behavior}")
        if speech:
            content_lines.append(f"(发言) {speech}")
        content = "\n".join(content_lines) if content_lines else ""

        self._emit(
            {
                "type": "agent_message",
                "category": category,
                "categoryDisplay": cat_display,
                "agentName": player_name,
                "action": action,
                "thought": thought or "",
                "behavior": behavior or "",
                "speech": speech or "",
                "content": content or (speech or ""),
            }
        )

    def _write_field(self, file_obj, label: str, content: Optional[str]):
        """按字段写入文本，自动对齐多行内容。"""
        if not content:
            return

        prefix = f"    ({label}) "
        lines = content.splitlines() or [content]

        continuation_prefix = " " * len(prefix)
        for idx, line in enumerate(lines):
            current_prefix = prefix if idx == 0 else continuation_prefix
            file_obj.write(f"{current_prefix}{line.rstrip()}\n")

    def log_vote(
        self,
        voter: str,
        target: str,
        vote_type: str = "投票",
        speech: Optional[str] = None,
        behavior: Optional[str] = None,
        thought: Optional[str] = None
    ):
        """记录投票信息（支持详细信息）"""
        action = f"投票给 {target}"
        self.log_message_detail(
            category=vote_type,
            player_name=voter,
            speech=speech,
            behavior=behavior,
            thought=thought,
            action=action
        )

        # log_message_detail 已经会推送结构化事件

    def log_vote_result(self, result: str, votes_detail: str, vote_type: str = "投票结果", action: str = "被选中击杀"):
        """记录投票结果"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display(vote_type)

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("-" * 80 + "\n")
            f.write(
                f"[{timestamp}] {cat_display} {result} {action} ({votes_detail})\n")
            f.write("-" * 80 + "\n\n")

        self._emit(
            {
                "type": "system",
                "category": vote_type,
                "categoryDisplay": cat_display,
                "content": f"{cat_display} {result} {action} ({votes_detail})",
            }
        )

    def log_action(self, action_type: str, content: str):
        """记录特殊行动（简略版，用于纯动作记录）"""
        # 如果需要详细版，应使用 log_message_detail 并传入 action
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display(action_type)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {cat_display} {content}\n\n")

        self._emit(
            {
                "type": "system",
                "category": action_type,
                "categoryDisplay": cat_display,
                "content": f"{cat_display} {content}",
            }
        )

    def log_death(self, phase: str, players: list[str]):
        """记录死亡信息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display(phase)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            if players:
                death_list = ", ".join(players)
                f.write(f"[{timestamp}] {cat_display} {death_list}\n\n")
            else:
                f.write(f"[{timestamp}] {cat_display} 无\n\n")

        self._emit(
            {
                "type": "system",
                "category": phase,
                "categoryDisplay": cat_display,
                "content": f"{cat_display} {', '.join(players) if players else '无'}",
                "players": players,
            }
        )

    def log_announcement(self, content: str):
        """记录公告信息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display("公告")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {cat_display}\n    {content}\n\n")

        self._emit(
            {
                "type": "system",
                "category": "公告",
                "categoryDisplay": cat_display,
                "content": content,
            }
        )

    def log_alive_players(self, round_num: int, alive_players: list[str]):
        """记录当前存活玩家列表，通常在每回合结束时调用。"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        alive_text = ", ".join(alive_players) if alive_players else "(无人存活)"
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(
                f"[{timestamp}] 📋 存活玩家(第{round_num}回合结束): {alive_text}\n\n"
            )

        self._emit(
            {
                "type": "system",
                "category": "存活玩家",
                "content": f"存活玩家(第{round_num}回合结束): {alive_text}",
                "alivePlayers": alive_players,
            }
        )

    def log_last_words(self, player_name: str, content: str):
        """记录遗言"""
        # 遗言通常包含 speech，建议使用 log_message_detail
        # 这里保留是为了兼容旧调用，但重定向到新格式
        self.log_message_detail("遗言", player_name, speech=content)

    def log_reflection(
        self,
        round_num: int,
        player_name: str,
        thought: str,
        impressions: dict[str, str],
    ):
        """记录玩家回合结束后的反思（含私密思考和印象）。"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        impression_lines = [f"{name}:{imp}" for name,
                            imp in impressions.items()]
        impression_text = "\n".join(
            impression_lines) if impression_lines else "(无更新)"

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] [第{round_num}回合-反思] {player_name}\n")
            self._write_field(f, "思考", thought)
            self._write_field(f, "印象", impression_text)
            f.write("\n")

        self._emit(
            {
                "type": "memory",
                "agentName": player_name,
                "content": f"(思考) {thought}\n\n(印象)\n{impression_text}",
            }
        )

    def close(self, status: str = "正常结束"):
        """关闭日志文件并写入最终状态。"""
        if self.closed:
            return
        self.closed = True
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n" + "=" * 80 + "\n")
            f.write(
                f"游戏结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"游戏状态: {status}\n")
            f.write("=" * 80 + "\n")

        self._emit({"type": "system", "content": f"游戏结束: {status}"})
