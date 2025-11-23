# 狼人杀 AI 智能体游戏

<div align="center">

🐺 基于 AgentScope 的多智能体狼人杀游戏系统

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![AgentScope](https://img.shields.io/badge/AgentScope-0.1.0+-green.svg)](https://github.com/modelscope/agentscope)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[功能特性](#功能特性) • [快速开始](#快速开始) • [项目结构](#项目结构) • [配置说明](#配置说明) • [开发路线](#开发路线)

</div>

---

## 简介

这是一个基于大语言模型（LLM）和多智能体框架 AgentScope 构建的狼人杀游戏系统。9 个 AI 智能体将扮演不同角色（狼人、村民、预言家、女巫、猎人），通过自然语言进行推理、讨论、投票，展现出复杂的策略博弈和社交推理能力。

### 核心亮点

- 🤖 **智能 AI 玩家**：基于 LLM 的智能体，具备推理、欺骗、协作能力
- 🎭 **完整角色系统**：支持狼人、村民、预言家、女巫、猎人等经典角色
- 📝 **详细游戏日志**：自动记录每局游戏的完整过程，便于分析和回放
- 🔄 **检查点机制**：支持游戏状态保存和恢复
- 🌐 **多模型支持**：兼容 DashScope（通义千问）、OpenAI、Ollama 等多种 LLM
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
- 🚧 REST API 和 WebSocket 支持
- 🚧 Web 前端界面
- 🚧 游戏房间管理

详见 [AI 智能体增强需求文档](.kiro/specs/ai-agent-enhancement/requirements.md)

## 快速开始

### 环境要求

- Python 3.8+
- pip 包管理器

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
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
├── backend/                    # 后端核心代码
│   ├── main.py                # 应用入口
│   ├── config.py              # 配置管理
│   ├── core/                  # 核心游戏逻辑
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
├── frontend/                  # 前端（待开发）
├── .kiro/                    # Kiro AI 助手配置
│   └── specs/                # 功能规格文档
│       └── ai-agent-enhancement/  # AI 智能体增强
└── README.md                 # 项目说明文档
```

## 配置说明

所有配置都在 `backend/.env` 文件中管理。

### 必需配置

```bash
# 模型提供商（必选其一）
MODEL_PROVIDER=dashscope  # dashscope/openai/ollama

# API Keys（根据选择的提供商配置）
DASHSCOPE_API_KEY=your_key_here        # 阿里云通义千问
# 或
OPENAI_API_KEY=your_key_here           # OpenAI 或兼容接口

# 游戏语言
GAME_LANGUAGE=zh  # zh=中文, en=英文
```

### 可选配置

```bash
# OpenAI 配置
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-3.5-turbo

# Ollama 配置（本地模型）
OLLAMA_MODEL_NAME=qwen2.5:1.5b

# 游戏参数
MAX_GAME_ROUND=30              # 最大游戏轮数
MAX_DISCUSSION_ROUND=3         # 每个狼人的最大讨论轮数

# AgentScope Studio（可视化调试）
ENABLE_STUDIO=false
STUDIO_URL=http://localhost:3001
STUDIO_PROJECT=werewolf_game

# 检查点配置
CHECKPOINT_DIR=./data/checkpoints
CHECKPOINT_ID=players_checkpoint
```

### 支持的模型提供商

#### 1. DashScope（阿里云通义千问）

```bash
MODEL_PROVIDER=dashscope
DASHSCOPE_API_KEY=your_api_key
```

获取 API Key：https://dashscope.console.aliyun.com/

#### 2. OpenAI（或兼容接口）

```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-3.5-turbo
```

支持 OpenAI 兼容接口，如智谱 AI、DeepSeek 等。

#### 3. Ollama（本地模型）

```bash
MODEL_PROVIDER=ollama
OLLAMA_MODEL_NAME=qwen2.5:1.5b
```

需要先安装 Ollama：https://ollama.ai/

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

### 日志文件命名

```
game_YYYYMMDD_HHMMSS.log
```

例如：`game_20251123_173343.log`

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

## 核心模块说明

### 游戏引擎（game_engine.py）

控制游戏流程的核心模块，负责：
- 游戏阶段切换（夜晚/白天）
- 角色行动协调
- 投票统计和结果处理
- 胜负判定
- 游戏日志记录

### 角色系统（roles.py）

每个角色都有独立的类和行为逻辑：
- `BaseRole`：角色基类，定义通用接口
- `Werewolf`：狼人，支持团队讨论和投票
- `Villager`：村民，基础角色
- `Seer`：预言家，夜晚查验身份
- `Witch`：女巫，使用解药和毒药
- `Hunter`：猎人，死亡时开枪

### 配置管理（config.py）

从 `.env` 文件读取配置，支持：
- 多模型提供商切换
- 游戏参数调整
- 检查点路径配置
- 配置验证和打印

### 游戏日志（game_logger.py）

自动记录游戏详细过程：
- 玩家列表和角色分配
- 每回合的所有行动
- 发言、投票、技能使用
- 死亡信息和游戏结果

## 开发路线

### Phase 1: 核心游戏系统 ✅

- [x] 基础游戏流程
- [x] 角色系统
- [x] 智能体交互
- [x] 游戏日志

### Phase 2: AI 智能体增强 🚧

- [ ] 经验回放和学习
- [ ] 策略知识库
- [ ] 玩家画像系统
- [ ] 对手建模
- [ ] 概率推理引擎
- [ ] 信任度系统

详见 [AI 智能体增强规格文档](.kiro/specs/ai-agent-enhancement/)

### Phase 3: Web 服务 📋

- [ ] FastAPI REST API
- [ ] WebSocket 实时通信
- [ ] 游戏房间管理
- [ ] 用户认证系统

### Phase 4: 前端界面 📋

- [ ] React 前端应用
- [ ] 游戏大厅
- [ ] 实时游戏界面
- [ ] 历史记录查看

## 常见问题

### 找不到 .env 文件

```bash
cd backend
copy .env.example .env  # Windows
# 或
cp .env.example .env    # Linux/Mac
```

然后编辑 `.env` 文件，填入你的 API Key。

### API Key 错误

检查 `.env` 文件中的配置：
- 确保 `MODEL_PROVIDER` 设置正确
- 确保对应的 API Key 有效且有余额
- 检查网络连接

### 模块导入错误

确保在 `backend` 目录下运行：

```bash
cd backend
python main.py
```

### 游戏卡住不动

可能是 LLM 响应慢或超时，检查：
- 网络连接是否正常
- API Key 是否有效
- 模型服务是否可用

## 技术栈

- **多智能体框架**：[AgentScope](https://github.com/modelscope/agentscope)
- **大语言模型**：DashScope / OpenAI / Ollama
- **编程语言**：Python 3.8+
- **数据验证**：Pydantic
- **异步编程**：asyncio

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 致谢

- [AgentScope](https://github.com/modelscope/agentscope) - 强大的多智能体框架
- [阿里云 DashScope](https://dashscope.console.aliyun.com/) - 通义千问 API
- 所有贡献者和支持者

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by the Werewolf AI Team

</div>
