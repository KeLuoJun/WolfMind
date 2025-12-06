# -*- coding: utf-8 -*-
"""游戏日志记录模块"""
import os
from datetime import datetime
from typing import Optional


class GameLogger:
    """狼人杀游戏日志记录器"""

    def __init__(self, game_id: str, log_dir: str = "./data/game_logs"):
        """初始化日志记录器

        Args:
            game_id: 游戏ID（格式：YYYYMMDD_HHMMSS）
            log_dir: 日志文件存储目录（相对于 backend 目录）
        """
        self.game_id = game_id
        self.log_dir = log_dir
        self.log_file = os.path.join(log_dir, f"game_{game_id}.log")
        self.current_round = 0
        self.start_time = datetime.now()

        # 确保日志目录存在
        os.makedirs(log_dir, exist_ok=True)

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

    def log_message(self, category: str, content: str, player_name: Optional[str] = None):
        """记录游戏消息

        Args:
            category: 消息类别（如：狼人讨论、狼人投票、白天讨论、投票等）
            content: 消息内容
            player_name: 玩家名称（可选）
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            if player_name:
                f.write(
                    f"[{timestamp}] [{category}] {player_name}: {content}\n")
            else:
                f.write(f"[{timestamp}] [{category}] {content}\n")

    def log_message_detail(
        self,
        category: str,
        player_name: str,
        speech: Optional[str] = None,
        behavior: Optional[str] = None,
        thought: Optional[str] = None,
    ):
        """记录包含思考/行为/发言的消息。"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            if thought:
                f.write(
                    f"[{timestamp}] [{category}-思考] {player_name}: {thought}\n")
            if speech or behavior:
                prefix = f"[{behavior}] " if behavior else ""
                content = f"{prefix}{speech}" if speech else prefix.strip()
                f.write(
                    f"[{timestamp}] [{category}] {player_name}: {content}\n")

    def log_vote(self, voter: str, target: str, vote_type: str = "投票"):
        """记录投票信息

        Args:
            voter: 投票者
            target: 被投票者
            vote_type: 投票类型（投票/狼人投票）
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] [{vote_type}] {voter} 投票给 {target}\n")

    def log_vote_result(self, result: str, votes_detail: str, vote_type: str = "投票结果", action: str = "被选中击杀"):
        """记录投票结果

        Args:
            result: 投票结果（被选中的玩家）
            votes_detail: 投票详情
            vote_type: 投票类型（投票结果/狼人投票结果）
            action: 行动描述（被选中击杀/被投出）
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(
                f"[{timestamp}] [{vote_type}] {result} {action} (票数: {votes_detail})\n\n")

    def log_action(self, action_type: str, content: str):
        """记录特殊行动

        Args:
            action_type: 行动类型（如：女巫行动、预言家查验、猎人开枪等）
            content: 行动内容
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] [{action_type}] {content}\n\n")

    def log_death(self, phase: str, players: list[str]):
        """记录死亡信息

        Args:
            phase: 阶段（夜晚死亡/白天死亡）
            players: 死亡玩家列表
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            if players:
                death_list = ", ".join(players)
                f.write(f"[{timestamp}] [{phase}] {death_list}\n\n")
            else:
                f.write(f"[{timestamp}] [{phase}] 无\n\n")

    def log_announcement(self, content: str):
        """记录公告信息

        Args:
            content: 公告内容
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] [公告] {content}\n\n")

    def log_last_words(self, player_name: str, content: str):
        """记录遗言

        Args:
            player_name: 玩家名称
            content: 遗言内容
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] [遗言] {player_name}: {content}\n\n")

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
            f.write(
                f"[{timestamp}] [第{round_num}回合-反思] {player_name} thought: {thought}\n"
            )
            f.write(
                f"[{timestamp}] [第{round_num}回合-印象] {player_name} -> {impression_str}\n\n"
            )

    def close(self):
        """关闭日志文件"""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write("\n" + "=" * 80 + "\n")
            f.write(
                f"游戏结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n")
