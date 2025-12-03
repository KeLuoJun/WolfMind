# 狼人杀 AI 智能体游戏

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
- 🔄 **检查点机制**：支持游戏状态保存和恢复
- 🌐 **多模型支持**：兼容 DashScope（通义千问）、OpenAI等多种 LLM
- 🌍 **中英双语**：支持中文和英文游戏提示词

## 功能特性

### 已实现功能 ✅

- ✅ 完整的狼人杀游戏流程（夜晚/白天阶段）
- ✅ 9 个角色的独立行为逻辑
- ✅ 智能体之间的自然语言交互
- ✅ 游戏状态管理和胜负判定
- ✅ 详细的游戏日志记录系统
- ✅ 检查点保存和加载
- ✅ 多 LLM 提供商支持
- ✅ 中英文双语支持

### 开发中功能 🚧

- 🚧 AI 智能体自主学习和策略优化
- 🚧 经验回放和策略知识库
- 🚧 玩家画像和对手建模
- 🚧 概率推理和信任度系统
- 🚧 Web 前端界面


## 快速开始

### 环境要求

- Python 3.8+
- pip 包管理器

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/KeLuoJun/werewolves.git
cd werewolf-game
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

# 设置游戏语言
GAME_LANGUAGE=zh  # zh=中文, en=英文
```

4. **运行游戏**

```bash
python main.py
```

就这么简单！游戏将自动开始，你可以在终端看到 AI 智能体之间的对话和游戏进程。

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
│   │   └── game_prompts.py   # 游戏提示词
│   ├── data/                 # 数据目录
│   │   ├── checkpoints/      # 游戏检查点
│   │   └── game_logs/        # 游戏日志
│   ├── .env.example          # 环境变量示例
│   └── requirements.txt      # Python 依赖
├── frontend/                 # 前端（待开发）
└── README.md                 # 项目说明文档
```



## 游戏规则

### 角色介绍

- **狼人（3人）**：每晚选择一名玩家击杀，白天隐藏身份并误导村民
- **村民（3人）**：普通玩家，通过讨论和投票找出狼人
- **预言家（1人）**：每晚可查验一名玩家的真实身份
- **女巫（1人）**：拥有解药（救人）和毒药（杀人），各一次
- **猎人（1人）**：被淘汰时可以带走一名玩家

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
游戏ID: 20251123_173343
开始时间: 2025-11-23 17:33:43
================================================================================

玩家列表:
- Player1: werewolf
- Player2: villager
- Player3: seer
...

第 1 回合
--------------------------------------------------------------------------------

【夜晚阶段】
[17:33:44] [狼人讨论] Player1: 我们淘汰Player5吧。
[17:33:50] [狼人投票] Player1 投票给 Player5
[17:33:55] [狼人投票结果] Player5 被选中击杀 (票数: Player5: 3)
[17:33:57] [女巫行动] 使用解药救了 Player5
[17:33:59] [预言家查验] 查验 Player4, 结果: villager

【白天阶段】
[17:33:59] [公告] 天亮了，请所有玩家睁眼。昨晚平安夜，无人被淘汰。
[17:34:02] [白天讨论] Player4: 我认为我们应该仔细观察...
[17:34:24] [投票] Player4 投票给 Player5
[17:34:44] [投票结果] Player5 被投出 (票数: Player5: 7)
```



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
