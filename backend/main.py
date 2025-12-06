# -*- coding: utf-8 -*-
"""后端主入口 - 重构版本"""
import asyncio
import sys

from core.game_engine import werewolves_game
from config import config

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeMultiAgentFormatter, OpenAIMultiAgentFormatter, OllamaMultiAgentFormatter
from agentscope.model import DashScopeChatModel, OpenAIChatModel, OllamaChatModel
from core.formatted_session import FormattedJSONSession

prompt = """
你是一个名为{name}的狼人杀游戏玩家。
# 狼人杀游戏规则说明（标准9人局）

## 游戏配置
- **总玩家**：9人
- **狼人阵营**（3人）：互相认识，每晚共同杀害一名玩家
- **好人阵营**（6人）：
  - 神职：预言家×1、女巫×1、猎人×1
  - 平民：普通村民×3

## 角色能力详解
### 1. 狼人（3人）
- **能力**：夜晚阶段共同睁眼，协商选择一名玩家杀害
- **胜利条件**：所有神职死亡，或所有平民死亡

### 2. 预言家（1人）
- **能力**：每晚查验一名玩家身份，主持人告知"狼人"或"好人"
- **注意**：仅知阵营，不知具体角色（如女巫、猎人等）

### 3. 女巫（1人）
- **能力**：
  - 解药：可救活当晚狼人击杀目标（包括自救），仅一次
  - 毒药：可毒杀一名玩家，仅一次
- **关键规则**：
  a. 每晚狼人行动后，主持人告知女巫当晚击杀目标（不透露身份）
  b. 女巫可选择：①使用解药救人 ②使用毒药杀人 ③不使用药水
  c. 同夜不能同时使用两种药水
  d. 首夜可以自救
  e. 女巫被毒杀或白天投票出局时，不能使用药水

### 4. 猎人（1人）
- **能力**：被狼人杀害或被投票出局时，可开枪带走一名玩家
- **限制**：被女巫毒杀时不能发动技能
- **注意**：猎人发动技能时需立即宣布并指定目标，不能延迟发动

### 5. 村民（3人）
- **能力**：无特殊技能
- **胜利条件**：与所有好人阵营玩家共同淘汰所有狼人

## 完整游戏流程

### 第一夜（特殊首夜规则）
1. **狼人行动**：3名狼人互相确认身份，共同选择击杀目标
2. **预言家行动**：查验一名玩家身份
3. **女巫行动**：
   - 得知狼人击杀目标（不告知身份）
   - 可选择：①使用解药（可自救） ②使用毒药 ③不用药
4. **猎人行动**：无

### 常规夜晚（第2夜及以后）
1. 狼人选择击杀目标
2. 预言家查验玩家
3. 女巫行动（规则同首夜，但解药已用则不能救人）

### 白天阶段
1. **公布死亡信息**：
   - 若女巫使用解药：宣布"昨晚平安夜"
   - 否则：宣布死亡玩家名单（狼刀+毒杀）
   - 不公布死亡原因和具体角色

2. **遗言环节**（若适用）：
   - 首夜死亡玩家有遗言
   - 后续夜晚死亡的玩家通常无遗言（可自定义规则）

3. **轮流发言**：
   - 存活玩家按顺序发言
   - 可分析局势、表明身份、怀疑对象等

4. **投票放逐**：
   - 每人一票，可弃权
   - 得票最多者出局
   - **平票处理**：
     a. 第一次平票：平票玩家再次发言
     b. 第二次投票：若再次平票，则无人出局，直接进入黑夜

5. **宣布结果**：
   - 公布被放逐玩家身份
   - 若猎人被放逐，立即发动技能带走一名玩家

## 特殊情况处理
1. **女巫双药使用时机**：
   - 解药和毒药可在不同夜晚使用
   - 女巫死亡时未使用的药水作废

2. **猎人技能触发**：
   - 被狼杀→立即开枪
   - 被投票出局→宣布身份后开枪
   - 被毒杀→不能开枪

3. **连续平安夜**：
   - 女巫已用解药后，狼人每夜必有人死亡（除非刀到猎人被开枪）

## 胜利判定
- **狼人胜利**：满足任一条件：
  ① 所有神职（预言家、女巫、猎人）死亡
  ② 所有平民（3村民）死亡

- **好人胜利**：所有狼人（3人）被放逐或毒杀

## 游戏结束
- 任一胜利条件达成时，游戏立即结束
- 宣布获胜阵营及所有玩家身份
- 进行游戏复盘分析
---
*注：此为基础标准规则，实际游戏可根据需求调整细节*
"""


def get_official_agents(name: str) -> ReActAgent:
    """根据配置获取官方狼人杀代理。"""

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
        )
    elif config.model_provider == "openai":
        agent = ReActAgent(
            name=name,
            sys_prompt=prompt.format(name=name),
            model=OpenAIChatModel(
                api_key=config.openai_api_key,
                model_name=config.openai_model_name,
                client_args={
                    "base_url": config.openai_base_url,
                },
            ),
            formatter=OpenAIMultiAgentFormatter(),
        )
    elif config.model_provider == "ollama":
        agent = ReActAgent(
            name=name,
            sys_prompt=prompt.format(name=name),
            model=OllamaChatModel(
                model_name=config.ollama_model_name,
            ),
            formatter=OllamaMultiAgentFormatter(),
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

    # 准备 9 名玩家（可在此修改名字）
    print("\n正在创建 9 个玩家...")
    players = [get_official_agents(f"Player{_ + 1}") for _ in range(9)]
    print("✓ 玩家创建完成\n")

    # 提示：也可以在此替换为自定义的全部代理

    # 从已有检查点加载状态
    print(f"正在加载检查点: {config.checkpoint_dir}/{config.checkpoint_id}.json")
    session = FormattedJSONSession(save_dir=config.checkpoint_dir)
    # await session.load_session_state(
    #     session_id=config.checkpoint_id,
    #     **{player.name: player for player in players},
    # )
    print("✓ 检查点加载完成\n")

    print("=" * 50)
    print("🎮 游戏开始！")
    print("=" * 50 + "\n")

    await werewolves_game(players)

    # 将最新状态保存到检查点
    print(f"\n正在保存检查点: {config.checkpoint_dir}/{config.checkpoint_id}.json")
    # await session.save_session_state(
    #     session_id=config.checkpoint_id,
    #     **{player.name: player for player in players},
    # )
    print("✓ 检查点保存完成")
    print("\n游戏结束！")


if __name__ == "__main__":
    asyncio.run(main())
