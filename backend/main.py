# -*- coding: utf-8 -*-
"""后端主入口 - 重构版本"""
import asyncio
import sys
from pathlib import Path

try:
    from .core.game_engine import werewolves_game 
    from .core.knowledge_base import PlayerKnowledgeStore  
    from .config import config 
except Exception:
    from core.game_engine import werewolves_game
    from core.knowledge_base import PlayerKnowledgeStore
    from config import config
from analysis.pipeline import run_analysis

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeMultiAgentFormatter, OpenAIMultiAgentFormatter, OllamaMultiAgentFormatter
from agentscope.model import DashScopeChatModel, OpenAIChatModel, OllamaChatModel
from agentscope.session import JSONSession

prompt = """
你是一个名为{name}的狼人杀游戏玩家。
# 狼人杀游戏规则（标准9人局）

## 游戏概述
狼人杀是一个**阵营对抗的社交推理游戏**。玩家分为狼人阵营和好人阵营，在黑夜与白天的交替中进行博弈。

### 阵营构成
| 阵营 | 人数 | 角色 | 能力 |
|------|------|------|------|
| **狼人阵营** | 3人 | 狼人 | 夜间协商击杀一名玩家 |
| **好人阵营** | 6人 | 预言家 | 夜间查验一名玩家的阵营（狼人/好人） |
|  |  | 女巫 | 拥有解药（救人）和毒药（杀人）各一次 |
|  |  | 猎人 | 死亡时可开枪带走一名玩家（被女巫毒杀除外） |
|  |  | 村民 | 无特殊能力，依靠逻辑推理找出狼人 |

## 游戏核心机制

### 1. 夜间行动顺序
1. **狼人** → 共同选择击杀目标
2. **预言家** → 查验一名玩家身份（仅知阵营）
3. **女巫** → 得知狼人击杀目标，可选择：
   - 使用解药救人（包括自救）
   - 使用毒药杀人
   - 不使用药水
   - *同夜不能同时使用两种药水*

### 2. 白天流程
1. **公布死亡**：
   - 若女巫使用解药 → 宣布"平安夜"
   - 否则 → 公布死亡玩家名单（不透露死因）
2. **遗言阶段**（仅首夜死亡的玩家有遗言）
3. **轮流发言**：
   - 所有存活玩家依次发言
   - 可分析、推理、表明身份或质疑他人
4. **投票放逐**：
   - 每人一票，可弃权
   - 得票最多者出局
   - **平票处理**：
     - 第一次平票 → 平票玩家再次发言
     - 第二次投票 → 若仍平票，无人出局，进入黑夜
5. **猎人技能**（若被投出局）：
   - 立即宣布身份并开枪带走一名玩家

## 关键规则详解

### 女巫行动限制
- **首夜规则**：可以自救
- **药水使用**：
  - 解药和毒药可在不同夜晚使用
  - 女巫死亡时，未用药水作废
  - 被毒杀或投票出局时，不能用药水
- **信息保密**：
  - 仅女巫知道当晚狼人击杀目标
  - 被救玩家本人不知道自己曾被击杀
  - 玩家不得声称"我知道刀口"等超出公开信息的内容

### 猎人技能触发条件
- ✅ **可以开枪**：被狼人杀害、被投票出局
- ❌ **不能开枪**：被女巫毒杀
- **技能时机**：夜间死亡，等到白天后立即开枪；白天死亡，立即开枪。

### 信息公开范围
- **夜间信息**：仅行动角色知道自己的操作结果
- **白天信息**：
  - 只公布死亡名单（不透露死因和角色）
  - 出局玩家公布身份
  - 平安夜不透露任何细节

### 特殊术语
- **平安夜**：夜晚无人死亡
- **刀口**：狼人选择的击杀目标（仅女巫知道）
- **查杀**：预言家查验到的狼人

## 胜利条件

### 狼人阵营胜利（满足任一）：
1. **屠神路线**：所有神职（预言家、女巫、猎人）死亡
2. **屠民路线**：所有平民（3名村民）死亡

### 好人阵营胜利：
- 所有狼人（3人）被放逐或毒杀

## 游戏结束
- 当任一胜利条件达成时，游戏立即结束
- 公布所有玩家身份并进行复盘

## 重要提醒
1. **独立思考**：不要轻易相信他人，所有玩家都可能伪装
2. **逻辑推理**：基于公开信息和行为模式进行判断
3. **策略博弈**：每个决策都需权衡风险与收益
4. **团队协作**（好人阵营）：共享信息，共同推理
5. **伪装欺骗**（狼人阵营）：隐藏身份，误导好人
"""


def get_official_agents(
    name: str,
    model_cfg: dict[str, str] | None = None,
) -> ReActAgent:
    """根据配置获取官方狼人杀代理，可指定模型/密钥/基址覆盖。"""

    # 根据配置选择模型
    if config.model_provider == "dashscope":
        agent = ReActAgent(
            name=name,
            sys_prompt=prompt.format(name=name),
            model=DashScopeChatModel(
                api_key=config.dashscope_api_key,
                model_name=config.dashscope_model_name,
            ),
            formatter=DashScopeMultiAgentFormatter(),
            print_hint_msg=False,  # 禁用提示信息打印，避免重复输出
        )
    elif config.model_provider == "openai":
        cfg = model_cfg or {
            "api_key": config.openai_api_key,
            "base_url": config.openai_base_url,
            "model_name": config.openai_model_name,
        }
        agent = ReActAgent(
            name=name,
            sys_prompt=prompt.format(name=name),
            model=OpenAIChatModel(
                api_key=cfg.get("api_key"),
                model_name=cfg.get("model_name"),
                client_args={
                    "base_url": cfg.get("base_url"),
                },
            ),
            formatter=OpenAIMultiAgentFormatter(),
            print_hint_msg=False,  # 禁用提示信息打印，避免重复输出
        )
    elif config.model_provider == "ollama":
        agent = ReActAgent(
            name=name,
            sys_prompt=prompt.format(name=name),
            model=OllamaChatModel(
                model_name=config.ollama_model_name,
            ),
            formatter=OllamaMultiAgentFormatter(),
            print_hint_msg=False,  # 禁用提示信息打印，避免重复输出
        )
    else:
        raise ValueError(f"不支持的模型提供商: {config.model_provider}")

    return agent


async def main() -> None:
    """The main entry point for the werewolf game."""

    # 验证配置
    is_valid, error_msg = config.validate()
    if not is_valid:
        print(f"❌ 配置错误: {error_msg}")
        print("请检查 .env 文件并设置正确的配置")
        sys.exit(1)

    # 打印配置信息
    config.print_config()

    # 如果启用了 Studio，初始化 AgentScope Studio
    if config.enable_studio:
        import agentscope
        agentscope.init(
            studio_url=config.studio_url,
            project=config.studio_project,
        )
        print(f"✓ AgentScope Studio 已启用: {config.studio_url}")

    # 准备 9 名玩家（可在此修改名字/模型）
    print("\n正在创建 9 个玩家...")
    model_overrides = (
        config.openai_player_configs
        if config.model_provider == "openai"
        else [None] * 9
    )
    players = [
        get_official_agents(f"Player{idx + 1}", model_overrides[idx])
        for idx in range(9)
    ]
    print("✓ 玩家创建完成\n")

    # 记录玩家使用的模型（用于日志与经验文件）
    def _model_label(provider: str, cfg: dict[str, str] | None) -> str:
        if provider == "openai" and cfg:
            return f"openai: {cfg.get('model_name', '')}"
        if provider == "dashscope":
            return f"dashscope: {config.dashscope_model_name}"
        if provider == "ollama":
            return f"ollama: {config.ollama_model_name}"
        return provider

    player_model_map = {
        player.name: _model_label(config.model_provider, model_overrides[idx])
        for idx, player in enumerate(players)
    }

    # 初始化玩家知识库（每次启动都会创建新的空文件）
    knowledge_store = PlayerKnowledgeStore(
        checkpoint_dir=config.experience_dir,
        base_filename=config.experience_id,
    )
    knowledge_store.set_player_models(player_model_map)
    knowledge_store.save()
    print(f"✓ 知识库已创建: {knowledge_store.path}")

    # 提示：也可以在此替换为自定义的全部代理

    # 从已有检查点加载状态
    print(f"正在加载经验存档: {config.experience_dir}/{config.experience_id}.json")
    session = JSONSession(save_dir=config.experience_dir)
    # await session.load_session_state(
    #     session_id=config.checkpoint_id,
    #     **{player.name: player for player in players},
    # )
    print("✓ 检查点加载完成\n")

    print("=" * 50)
    print("🎮 游戏开始！")
    print("=" * 50 + "\n")

    log_path, experience_path = await werewolves_game(
        players,
        knowledge_store=knowledge_store,
        player_model_map=player_model_map,
    )

    # 将最新状态保存到检查点
    print(f"\n正在保存经验存档: {config.experience_dir}/{config.experience_id}.json")
    # await session.save_session_state(
    #     session_id=config.experience_id,
    #     **{player.name: player for player in players},
    # )
    print("✓ 检查点保存完成")

    # 自动进行数据分析
    if config.auto_analyze:
        print("\n" + "=" * 50)
        print("📊 正在自动生成游戏分析报告...")
        print("=" * 50)
        try:
            report_path = await run_analysis(
                log_path=Path(log_path),
                experience_path=Path(experience_path)
            )
            print(f"✓ 分析报告已生成: {report_path}")
        except Exception as e:
            print(f"❌ 分析报告生成失败: {e}")

    print("\n游戏结束！")


if __name__ == "__main__":
    asyncio.run(main())
