# Agent 狼人杀游戏

<div align="center">

🐺 基于 AgentScope 的多智能体狼人杀游戏系统

![狼人杀 AI 游戏](./static/werewolf_ai_game.png)

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![AgentScope](https://img.shields.io/badge/AgentScope-0.1.0+-green.svg)](https://github.com/modelscope/agentscope)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[功能特性](#功能特性) • [快速开始](#快速开始) • [项目结构](#项目结构) • [游戏规则](#游戏规则)

</div>

---

## 简介

这是一个基于大语言模型（LLM）和多智能体框架 AgentScope 构建的狼人杀游戏系统。9 个 AI 智能体将扮演不同角色（狼人、村民、预言家、女巫、猎人），通过自然语言进行推理、讨论、投票，展现出复杂的策略博弈和社交推理能力。

### 核心亮点

- 🤖 **智能 AI 玩家**：基于 LLM 的智能体，具备推理、欺骗、协作能力
- 🎭 **完整角色系统**：支持狼人、村民、预言家、女巫、猎人等经典角色
- 📝 **详细游戏日志**：自动记录每局游戏的完整过程，便于分析和回放
- 🔄 **玩家经验**：实时更新并保存玩家的游戏经验
- 🌐 **多模型支持**：兼容 DashScope（通义千问）、OpenAI等多种 LLM

## 功能特性

### 已实现功能 ✅

- ✅ 完整的狼人杀游戏流程（夜晚/白天阶段）
- ✅ 9 个角色的独立行为逻辑
- ✅ 智能体之间的自然语言交互
- ✅ 游戏状态管理和胜负判定
- ✅ 详细的游戏日志记录系统
- ✅ 玩家经验更新与保存
- ✅ 多 LLM 提供商支持
- ✅ 玩家画像和对手建模
- ✅ AI 智能体自主学习和策略优化
- ✅ 经验和策略知识库

### 开发中功能 🚧

- 🚧 Web 前端界面
- 🚧 根据游戏日志进行深度分析


## 快速开始

### 环境要求

- Python 3.8+
- pip 包管理器

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/KeLuoJun/WolfMind.git
cd WolfMind
```

2. **安装依赖**

```bash
cd backend
pip install -r requirements.txt
```

3. **配置环境变量**

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

编辑 `.env` 文件，配置你的 API Key：

```bash
# 选择模型提供商
MODEL_PROVIDER=dashscope  # dashscope/openai/ollama

# 配置对应的 API Key
DASHSCOPE_API_KEY=your_api_key_here

# (可选) 启用 AgentScope Studio 可视化
ENABLE_STUDIO=false
```

4. **运行游戏**

```bash
python main.py
```

就这么简单！游戏将自动开始，你可以在终端看到 AI 智能体之间的对话和游戏进程。


**模型选择提示**：

- DashScope：最小配置，推荐直连官方 API。
- OpenAI 兼容：支持自定义 `OPENAI_BASE_URL`，可接驳自建代理。
- Ollama：在本地运行模型，仅需安装 Ollama 和对应模型。

## 项目结构

```
werewolf-game/
├── backend/                  # 后端核心代码
│   ├── main.py               # 应用入口
│   ├── config.py             # 配置管理
│   ├── core/                 # 核心游戏逻辑
│   │   ├── game_engine.py    # 游戏引擎
│   │   ├── game_logger.py    # 游戏日志记录器
│   │   └── utils.py          # 工具函数
│   ├── models/               # 数据模型
│   │   ├── roles.py          # 角色系统
│   │   └── schemas.py        # 数据结构
│   ├── prompts/              # 提示词
│   │   ├── game_prompts.py   # 游戏提示词
│   │   └── role_prompts.py   # 角色提示词
│   ├── data/                 # 数据目录
│   │   ├── experiences/      # 玩家经验存档
│   │   └── game_logs/        # 游戏日志
│   ├── .env.example          # 环境变量示例
│   └── requirements.txt      # Python 依赖
├── frontend/                 # 前端（待开发）
└── README.md                 # 项目说明文档
```

## 系统架构与关键模块

- 主入口：[backend/main.py](backend/main.py) 负责读取配置、初始化 9 名 ReActAgent 玩家、构建知识库并启动一局完整对局。
- 配置管理：[backend/config.py](backend/config.py) 从 `.env` 读取模型提供商、API Key、回合上限和玩家经验存档路径等参数，并提供校验和脱敏打印。
- 核心引擎：[backend/core/game_engine.py](backend/core/game_engine.py) 实现夜晚/白天循环、平票 PK、猎人开枪、胜负判定以及跨局知识更新。
- 日志系统：[backend/core/game_logger.py](backend/core/game_logger.py) 将每局的关键动作写入 `backend/data/game_logs/game_<timestamp>.log`，包含发言、行为、思考、投票与死亡信息。
- 长期记忆：[backend/core/knowledge_base.py](backend/core/knowledge_base.py) 为每名玩家维护持久化知识，启动时创建带时间戳的新经验存档，回合后自动增量保存。
- 角色逻辑：[backend/models/roles.py](backend/models/roles.py) 定义狼人、村民、预言家、女巫、猎人五类角色的专属夜晚行为、投票/讨论流程及提示词。
- 数据模型：[backend/models/schemas.py](backend/models/schemas.py) 用 Pydantic 规范化输出结构（speech/behavior/thought、投票、毒药/查验/开枪等）。
- 提示词集合：[backend/prompts/game_prompts.py](backend/prompts/game_prompts.py) 与 [backend/prompts/role_prompts.py](backend/prompts/role_prompts.py) 分别提供主持人/流程提示与角色策略指南。

## 运行时输出与数据

- **游戏日志**：默认写入 `backend/data/game_logs`，包含完整时序的发言、投票、行动及胜负公告，便于回放与分析。
- **经验存档/知识库**：每次启动都会在 `backend/data/experiences` 新建带时间戳的 `players_experience_*.json`，保存玩家的跨局经验；本局结束时会合并最新认知并落盘。历史示例文件仍保留 `checkpoint` 前缀，兼容查看。



## 游戏规则

### 角色介绍

- **狼人（3人）**：每晚选择一名玩家击杀，白天隐藏身份并误导村民
- **村民（3人）**：普通玩家，通过讨论和投票找出狼人
- **预言家（1人）**：每晚可查验一名玩家的真实身份
- **女巫（1人）**：拥有解药（救人）和毒药（杀人），各一次
- **猎人（1人）**：被淘汰时可以带走一名玩家

## 关键实现要点

- 固定 9 名玩家（默认名称 Player1-9），随机分配 3 狼人、3 村民、预言家、女巫、猎人各 1 名。
- 夜晚阶段包含：狼人团队讨论与强制投票、女巫的解药/毒药决策（不可同夜双药）、预言家查验、猎人被刀时可立即开枪。
- 白天阶段支持轮流发言、公开投票、最多 3 轮 PK 平票仲裁（再平票按姓名顺位淘汰），猎人被投出时可开枪。
- 每轮结束存活玩家会更新对他人的印象，并写入跨局知识库；本局完成后合并并保存所有玩家长期经验。
- 胜负判定：清空狼队即好人胜；若神职或平民一侧被清空，或狼人数量达到存活人数一半，则狼人胜。

### 游戏流程

1. **夜晚阶段**
   - 狼人讨论并投票选择击杀目标
   - 女巫决定是否使用解药或毒药
   - 预言家查验一名玩家身份
   - 猎人（如果被杀）可以开枪带走一人

2. **白天阶段**
   - 主持人公布夜晚死亡玩家
   - 所有存活玩家依次发言讨论
   - 投票淘汰一名可疑玩家
   - 被淘汰玩家发表遗言
   - 猎人（如果被投出）可以开枪带走一人

3. **胜负判定**
   - 狼人获胜：狼人数量 ≥ 好人数量
   - 村民获胜：所有狼人被淘汰

## 游戏日志

每局游戏都会自动生成详细的日志文件，保存在 `backend/data/game_logs/` 目录。

### 日志内容

- 游戏基本信息（游戏 ID、开始时间）
- 玩家列表及角色分配
- 每回合的详细记录：
  - 夜晚阶段：狼人讨论、投票、女巫行动、预言家查验
  - 白天阶段：公告、讨论、投票、遗言
  - 死亡信息和游戏结果

### 日志示例

```
================================================================================
狼人杀游戏日志
游戏ID: 20251206_172558
开始时间: 2025-12-06 17:25:58
================================================================================

玩家列表:
  - Player5: villager
  - Player7: werewolf
  - Player6: hunter
  - Player4: werewolf
  - Player3: seer
  - Player1: villager
  - Player9: witch
  - Player8: villager
  - Player2: werewolf

================================================================================

第 1 回合
--------------------------------------------------------------------------------

【夜晚阶段】

[17:26:03] 🐺 狼人频道 | Player4
    (心声) 这是第一轮夜晚，我们没有太多的信息来判断谁可能是预言家或其他特殊角色。我们需要选择一个随机的目标。
    (表现) 与狼人们迅速地达成一致，选择一个随机的目标。
    (发言) 我认为我们可以先随机选一个目标，比如Player5，看看他们的反应如何。

[17:26:15] 🗡️ 狼人投票 | Player7 -> 投票给 Player5
    (心声) Player5是我们今晚的目标，希望他的出局能够让我们获得一些有价值的信息。
    (表现) 点头同意，并投票给Player5。
    (发言) 我们决定淘汰Player5。

--------------------------------------------------------------------------------
[17:26:21] 📊 狼人投票结果 Player5 被选中击杀 (Player5: 3)
--------------------------------------------------------------------------------

[17:26:30] 💊 女巫行动 | Player9
    (心声) 我需要评估是否使用解药。如果使用解药，那我应该相信预言家会找到狼人，但我不能确定谁是预言家。如果不使用解药，可能会失去一个有价值的队友。
    (表现) 闭着眼睛，显得很专注，似乎在思考
    (发言) 我需要一些时间考虑今晚的情况。

[17:26:35] 🔮 预言家行动 查验 Player9, 结果: witch

[17:26:35] 💀 夜晚死亡 Player5


【白天阶段】

[17:26:35] 📢 系统公告
    天亮了，请所有玩家睁眼。昨晚 Player5 被淘汰。

[17:26:40] 👻 遗言 | Player5
    (心声) 我已经出局，但仍然希望我的队友能够获胜。我会尽量留下一些有用的信息，帮助他们识别狼人。
    (表现) 神情严肃地看着其他玩家，试图传达一种信任的信息。
    (发言) 大家好，虽然我已出局，但我相信你们能找出真正的狼人。请仔细观察每个人的行为和发言，不要轻易下结论。

[17:26:45] 🗣️ 公开发言 | Player7
    (心声) Player5出局后没有明显表现出敌意，这可能是真的村民。我们需要更小心地分析其他玩家的发言，特别是那些试图引导我们的人。
    (表现) 环视周围玩家，试图从他们的表情和反应中找到线索。
    (发言) Player5的发言显得很真诚，但我们需要更多的线索来确定谁是狼人。我们应该仔细考虑每个玩家的言行，找出不一致的地方。
```

### 示例完整游戏日志 / 玩家经验

示例历史快照位于 `static/`，文件名沿用旧的 `checkpoint` 前缀，直接点击可查看：
- [完整对局日志（GLM-4.6）](static/game_20251210_150049_glm-4.6.log)
- [完整对局经验存档（GLM-4.6）](static/players_experience_20251210_150049_glm-4.6.json)
- 更多示例请自行查看 `static/`


## 技术栈

- **多智能体框架**：[AgentScope](https://github.com/modelscope/agentscope)
- **大语言模型**：DashScope / OpenAI / Ollama
- **编程语言**：Python 3.8+
- **数据验证**：Pydantic
- **异步编程**：asyncio


---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by the Werewolf AI Team

</div>
