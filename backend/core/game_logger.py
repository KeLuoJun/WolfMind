# -*- coding: utf-8 -*-
"""游戏日志记录模块"""
from datetime import datetime
from pathlib import Path
from typing import Optional


class GameLogger:
    """狼人杀游戏日志记录器"""

    def __init__(self, game_id: str, log_dir: Optional[str] = None):
        """初始化日志记录器

        Args:
            game_id: 游戏ID（格式：YYYYMMDD_HHMMSS）
            log_dir: 日志文件存储目录（相对于 backend 目录）
        """
        self.game_id = game_id
        base_dir = Path(__file__).resolve().parent.parent
        resolved_dir = Path(
            log_dir) if log_dir else base_dir / "data" / "game_logs"
        self.log_dir = resolved_dir
        self.log_file = resolved_dir / f"game_{game_id}.log"
        self.current_round = 0
        self.start_time = datetime.now()

        # 确保日志目录存在
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # 初始化日志文件
        self._init_log_file()

    def _init_log_file(self):
        """初始化日志文件头部信息"""
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("狼人杀游戏日志\n")
            f.write(f"游戏ID: {self.game_id}\n")
            f.write(f"开始时间: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n")

    def log_players(self, players_info: list[tuple[str, str]]):
        """记录玩家列表

        Args:
            players_info: 玩家信息列表，每项为 (玩家名, 角色名)
        """
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n玩家列表:\n")
            for name, role in players_info:
                f.write(f"  - {name}: {role}\n")
            f.write("\n" + "=" * 80 + "\n")

    def start_round(self, round_num: int):
        """开始新回合

        Args:
            round_num: 回合编号
        """
        self.current_round = round_num
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n第 {round_num} 回合\n")
            f.write("-" * 80 + "\n")

    def start_night(self):
        """开始夜晚阶段"""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n【夜晚阶段】\n\n")

    def start_day(self):
        """开始白天阶段"""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n【白天阶段】\n\n")

    CATEGORY_MAP = {
        "狼人讨论": "🐺 狼人频道",
        "狼人投票": "🗡️ 狼人投票",
        "女巫行动": "💊 女巫行动",
        "女巫行动(解药)": "💊 女巫行动",
        "女巫行动(毒药)": "💊 女巫行动",
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

    def _write_field(self, file_obj, label: str, content: Optional[str]):
        """按字段写入文本，自动对齐多行内容。"""
        if not content:
            return

        prefix = f"    ({label}) "
        lines = self._normalize_multiline(content)

        file_obj.write(f"{prefix}{lines[0]}\n")
        continuation_prefix = " " * len(prefix)
        for line in lines[1:]:
            # 保持后续行与内容起始位置对齐
            file_obj.write(f"{continuation_prefix}{line}\n")

    def _normalize_multiline(self, content: str) -> list[str]:
        """去除多行文本的公共缩进，避免日志中出现无意的回退或额外空格。"""
        lines = content.splitlines() or [content]
        if len(lines) <= 1:
            return [content]

        # 计算除首行外的最小公共前导空格数
        indent_sizes = [len(line) - len(line.lstrip(" "))
                        for line in lines[1:] if line.strip()]
        common_indent = min(indent_sizes) if indent_sizes else 0

        normalized = [lines[0].rstrip()]
        for line in lines[1:]:
            trimmed = line.rstrip()
            if common_indent and len(trimmed) >= common_indent:
                trimmed = trimmed[common_indent:]
            normalized.append(trimmed)

        return normalized

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

    def log_vote_result(self, result: str, votes_detail: str, vote_type: str = "投票结果", action: str = "被选中击杀"):
        """记录投票结果"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display(vote_type)

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("-" * 80 + "\n")
            f.write(
                f"[{timestamp}] {cat_display} {result} {action} ({votes_detail})\n")
            f.write("-" * 80 + "\n\n")

    def log_action(self, action_type: str, content: str):
        """记录特殊行动（简略版，用于纯动作记录）"""
        # 如果需要详细版，应使用 log_message_detail 并传入 action
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display(action_type)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {cat_display} {content}\n\n")

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

    def log_announcement(self, content: str):
        """记录公告信息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        cat_display = self._get_category_display("公告")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {cat_display}\n    {content}\n\n")

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
        impression_str = ", ".join([
            f"{name}:{imp}" for name, imp in impressions.items()
        ]) if impressions else "(无更新)"

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] [第{round_num}回合-反思] {player_name}\n")
            f.write(f"    (思考) {thought}\n")
            f.write(f"    (印象) {impression_str}\n\n")

    def close(self):
        """关闭日志文件"""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n" + "=" * 80 + "\n")
            f.write(
                f"游戏结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n")
