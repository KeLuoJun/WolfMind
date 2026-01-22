# -*- coding: utf-8 -*-
"""配置管理模块 - 从 .env 文件读取配置"""
from pathlib import Path
from typing import Optional


class Config:
    """配置类 - 管理所有游戏配置"""

    def __init__(self):
        """初始化配置，从 .env 文件加载"""
        self.backend_dir = Path(__file__).resolve().parent
        self.root_dir = self.backend_dir.parent
        self._env: dict[str, str] = {}
        self._load_env()

    def _load_env(self):
        """加载 .env 文件"""
        env_path = self.root_dir / ".env"
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    # 跳过注释和空行
                    if not line or line.startswith("#"):
                        continue
                    # 解析键值对
                    if "=" in line:
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip()
                        if key:
                            self._env[key] = value
        else:
            # 未找到 .env 文件时保持空配置，后续使用默认值
            self._env = {}

    def _get(self, key: str, default: str | None = None) -> Optional[str]:
        """从 .env 数据中获取配置，优先 .env 而非系统环境变量"""
        return self._env.get(key, default)

    # ==================== API 配置 ====================

    @property
    def dashscope_api_key(self) -> Optional[str]:
        """DashScope API Key"""
        return self._get("DASHSCOPE_API_KEY")

    @property
    def dashscope_model_name(self) -> str:
        """DashScope Model Name"""
        return self._get("DASHSCOPE_MODEL_NAME", "qwen2.5-32b-instruct")

    @property
    def openai_api_key(self) -> Optional[str]:
        """OpenAI API Key"""
        return self._get("OPENAI_API_KEY")

    @property
    def openai_player_mode(self) -> str:
        """OpenAI 玩家配置模式: single 或 per-player。"""

        return (self._get("OPENAI_PLAYER_MODE", "single") or "single").lower()

    def _get_player_override(self, key_prefix: str, idx: int) -> Optional[str]:
        """读取形如 KEY_P1..P9 的配置。"""

        return self._get(f"{key_prefix}_P{idx}")

    @property
    def openai_base_url(self) -> str:
        """OpenAI Base URL"""
        return self._get("OPENAI_BASE_URL", "https://api.openai.com/v1")

    @property
    def openai_model_name(self) -> str:
        """OpenAI Model Name"""
        return self._get("OPENAI_MODEL_NAME", "gpt-3.5-turbo")

    # 数据分析（报告生成）可选的独立 OpenAI 配置；未提供则回退共用配置
    @property
    def openai_analysis_api_key(self) -> Optional[str]:
        return self._get("ANALYSIS_OPENAI_API_KEY", None)

    @property
    def openai_analysis_base_url(self) -> Optional[str]:
        return self._get("ANALYSIS_OPENAI_BASE_URL", None)

    @property
    def openai_analysis_model_name(self) -> Optional[str]:
        return self._get("ANALYSIS_OPENAI_MODEL_NAME", None)

    @property
    def openai_analysis_config(self) -> Optional[dict[str, str]]:
        """分析模块独立 OpenAI 配置；若未设置则返回 None 以使用共用配置。"""

        key = self.openai_analysis_api_key
        base = self.openai_analysis_base_url
        model = self.openai_analysis_model_name

        if key or base or model:
            return {
                "api_key": key or (self.openai_api_key or ""),
                "base_url": base or self.openai_base_url,
                "model_name": model or self.openai_model_name,
            }
        return None

    @property
    def openai_player_api_keys(self) -> list[str]:
        """每个玩家的 OpenAI API Key 列表（从 OPENAI_API_KEY_P1..P9 读取）。"""

        return [self._get_player_override("OPENAI_API_KEY", i) or "" for i in range(1, 10)]

    @property
    def openai_player_base_urls(self) -> list[str]:
        """每个玩家的 OpenAI Base URL 列表（从 OPENAI_BASE_URL_P1..P9 读取）。"""

        return [self._get_player_override("OPENAI_BASE_URL", i) or "" for i in range(1, 10)]

    @property
    def openai_player_models(self) -> list[str]:
        """OpenAI 模型列表（从 OPENAI_MODEL_NAME_P1..P9 读取，按 Player1-Player9 顺序）。"""

        return [self._get_player_override("OPENAI_MODEL_NAME", i) or "" for i in range(1, 10)]

    @property
    def openai_player_configs(self) -> list[dict[str, str]]:
        """组合每位玩家的 OpenAI 配置。

        逻辑：
        - 若 OPENAI_PLAYER_MODE=single，则忽略玩家级字段，9 人共用全局 OPENAI_*。
        - 若 OPENAI_PLAYER_MODE=per-player：
            * 需为 9 个玩家全部提供 API_KEY/Base_URL/Model 的独立字段；缺失即报错。
        """

        keys = self.openai_player_api_keys
        bases = self.openai_player_base_urls
        models = self.openai_player_models

        mode = self.openai_player_mode

        if mode not in {"single", "per-player"}:
            raise ValueError("OPENAI_PLAYER_MODE 仅支持 single 或 per-player")

        # single: 全部使用全局配置
        if mode == "single":
            shared = {
                "api_key": self.openai_api_key or "",
                "base_url": self.openai_base_url,
                "model_name": self.openai_model_name,
            }
            return [shared] * 9

        # per-player: 每人必须有完整三元组
        configs: list[dict[str, str]] = []
        for idx in range(9):
            per_key = keys[idx]
            per_base = bases[idx]
            per_model = models[idx]

            if not (per_key and per_base and per_model):
                raise ValueError(
                    "OPENAI_PLAYER_MODE=per-player 时，OPENAI_API_KEY_Pn/OPENAI_BASE_URL_Pn/OPENAI_MODEL_NAME_Pn 均需填写"
                )
            configs.append(
                {
                    "api_key": per_key,
                    "base_url": per_base,
                    "model_name": per_model,
                }
            )

        return configs

    @property
    def ollama_model_name(self) -> str:
        """Ollama Model Name"""
        return self._get("OLLAMA_MODEL_NAME", "qwen2.5:1.5b")

    # ==================== 模型选择 ====================

    @property
    def model_provider(self) -> str:
        """模型提供商: dashscope, openai, ollama"""
        return self._get("MODEL_PROVIDER", "dashscope").lower()

    # ==================== 游戏配置 ====================

    @property
    def max_game_round(self) -> int:
        """最大游戏轮数"""
        return int(self._get("MAX_GAME_ROUND", "30"))

    @property
    def max_discussion_round(self) -> int:
        """每个狼人的最大讨论轮数"""
        return int(self._get("MAX_DISCUSSION_ROUND", "3"))

    # ==================== AgentScope Studio 配置 ====================

    @property
    def enable_studio(self) -> bool:
        """是否启用 Studio"""
        return self._get("ENABLE_STUDIO", "false").lower() == "true"

    @property
    def studio_url(self) -> str:
        """Studio URL"""
        return self._get("STUDIO_URL", "http://localhost:3001")

    @property
    def studio_project(self) -> str:
        """Studio 项目名称"""
        return self._get("STUDIO_PROJECT", "werewolf_game")

    # ==================== 经验分析配置 ====================

    @property
    def auto_analyze(self) -> bool:
        """是否在游戏结束后自动进行数据分析"""
        return self._get("AUTO_ANALYZE", "false").lower() == "true"

    # ==================== 检查点配置 ====================

    @property
    def experience_dir(self) -> str:
        """经验存档保存目录。"""
        raw_path = self._get("EXPERIENCE_DIR", "data/experiences")
        path = self._resolve_path(raw_path)
        return str(path)

    @property
    def experience_id(self) -> str:
        """经验存档文件名前缀。"""
        return self._get("EXPERIENCE_ID", "players_experience")

    @property
    def log_dir(self) -> str:
        """游戏日志目录。"""
        raw_path = self._get("LOG_DIR", "data/game_logs")
        return str(self._resolve_path(raw_path))

    def _resolve_path(self, raw_path: str) -> Path:
        """将相对路径解析为仓库根目录下的绝对路径。"""
        path = Path(raw_path)
        if not path.is_absolute():
            path = self.root_dir / path
        return path

    # ==================== 验证方法 ====================

    def validate(self) -> tuple[bool, str]:
        """验证配置是否完整

        Returns:
            (is_valid, error_message)
        """
        if self.model_provider == "dashscope":
            if not self.dashscope_api_key:
                return False, "DASHSCOPE_API_KEY 未设置"
        elif self.model_provider == "openai":
            try:
                player_cfgs = self.openai_player_configs
            except ValueError as exc:
                return False, str(exc)

            if any(not cfg.get("api_key") for cfg in player_cfgs):
                return False, "OPENAI_API_KEY 未设置，或 OPENAI_PLAYER_API_KEYS 不完整"
            if any(not cfg.get("base_url") for cfg in player_cfgs):
                return False, "OPENAI_BASE_URL 未设置，或 OPENAI_PLAYER_BASE_URLS 不完整"
            if any(not cfg.get("model_name") for cfg in player_cfgs):
                return False, "OPENAI_MODEL_NAME 未设置，或 OPENAI_PLAYER_MODELS 不完整"
        elif self.model_provider == "ollama":
            # Ollama 不需要 API Key
            pass
        else:
            return False, f"未知的模型提供商: {self.model_provider}"

        # if self.game_language not in ["zh", "en"]:
        #     return False, f"不支持的语言: {self.game_language}"

        return True, ""

    def print_config(self):
        """打印当前配置（隐藏敏感信息）"""
        print("=" * 50)
        print("当前配置:")
        print("=" * 50)
        print(f"模型提供商: {self.model_provider}")

        if self.model_provider == "dashscope":
            api_key = self.dashscope_api_key
            masked_key = f"{api_key[:8]}...{api_key[-4:]}" if api_key and len(
                api_key) > 12 else "未设置"
            print(f"DashScope API Key: {masked_key}")
        elif self.model_provider == "openai":
            api_key = self.openai_api_key
            masked_key = f"{api_key[:8]}...{api_key[-4:]}" if api_key and len(
                api_key) > 12 else "未设置"
            print(f"OpenAI API Key: {masked_key}")
            print(f"OpenAI Base URL: {self.openai_base_url}")
            print(f"OpenAI Model: {self.openai_model_name}")
            print(f"OpenAI Player Mode: {self.openai_player_mode}")
            try:
                player_cfgs = self.openai_player_configs
                model_list = [cfg.get("model_name", "") for cfg in player_cfgs]
                print("OpenAI Player Models: " + ", ".join(model_list))
            except ValueError:
                print("OpenAI Player Models: 配置错误")
        elif self.model_provider == "ollama":
            print(f"Ollama Model: {self.ollama_model_name}")

        # print(f"游戏语言: {self.game_language}")
        print(f"最大游戏轮数: {self.max_game_round}")
        print(f"最大讨论轮数: {self.max_discussion_round}")
        print(f"启用 Studio: {self.enable_studio}")
        print(f"自动数据分析: {self.auto_analyze}")
        print(f"经验存档目录: {self.experience_dir}")
        print("=" * 50)


# 全局配置实例
config = Config()
