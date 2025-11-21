# -*- coding: utf-8 -*-
# flake8: noqa: E501
"""The main entry point for the werewolf game."""
import asyncio
from gc import enable
import os

from game import werewolves_game

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeMultiAgentFormatter, OpenAIMultiAgentFormatter, OllamaMultiAgentFormatter
from agentscope.model import DashScopeChatModel, OpenAIChatModel, OllamaChatModel
from agentscope.session import JSONSession

prompt_en = """You're a werewolf game player named {name}.

# YOUR TARGET
Your target is to win the game with your teammates as much as possible.

# GAME RULES
- In werewolf game, players are divided into three werewolves, three villagers, one seer, one hunter and one witch.
    - Werewolves: kill one player each night, and must hide identity during the day.
    - Villagers: ordinary players without special abilities, try to identify and eliminate werewolves.
        - Seer: A special villager who can check one player's identity each night.
        - Witch: A special villager with two one-time-use potions: a healing potion to save a player from being killed at night, and a poison to eliminate one player at night.
        - Hunter: A special villager who can take one player down with them when they are eliminated.
- The game alternates between night and day phases until one side wins:
    - Night Phase
        - Werewolves choose one victim
        - Seer checks one player's identity
        - Witch decides whether to use potions
        - Moderator announces who died during the night
    - Day Phase
        - All players discuss and vote to eliminate one suspected player

# GAME GUIDANCE
- Try your best to win the game with your teammates, tricks, lies, and deception are all allowed, e.g. pretending to be a different role.
- During discussion, don't be political, be direct and to the point.
- The day phase voting provides important clues. For example, the werewolves may vote together, attack the seer, etc.
## GAME GUIDANCE FOR WEREWOLF
- Seer is your greatest threat, who can check one player's identity each night. Analyze players' speeches, find out the seer and eliminate him/her will greatly increase your chances of winning.
- In the first night, making random choices is common for werewolves since no information is available.
- Pretending to be other roles (seer, witch or villager) is a common strategy to hide your identity and mislead other villagers in the day phase.
- The outcome of the night phase provides important clues. For example, if witch uses the healing or poison potion, if the dead player is hunter, etc. Use this information to adjust your strategy.
## GAME GUIDANCE FOR SEER
- Seer is very important to villagers, exposing yourself too early may lead to being targeted by werewolves.
- Your ability to check one player's identity is crucial.
- The outcome of the night phase provides important clues. For example, if witch uses the healing or poison potion, if the dead player is hunter, etc. Use this information to adjust your strategy.
## GAME GUIDANCE FOR WITCH
- Witch has two powerful potions, use them wisely to protect key villagers or eliminate suspected werewolves.
- The outcome of the night phase provides important clues. For example, if the dead player is hunter, etc. Use this information to adjust your strategy.
## GAME GUIDANCE FOR HUNTER
- Using your ability in day phase will expose your role (since only hunter can take one player down)
- The outcome of the night phase provides important clues. For example, if witch uses the healing or poison potion, etc. Use this information to adjust your strategy.
## GAME GUIDANCE FOR VILLAGER
- Protecting special villagers, especially the seer, is crucial for your team's success.
- Werewolves may pretend to be the seer. Be cautious and don't trust anyone easily.
- The outcome of the night phase provides important clues. For example, if witch uses the healing or poison potion, if the dead player is hunter, etc. Use this information to adjust your strategy.

# NOTE
- [IMPORTANT] DO NOT make up any information that is not provided by the moderator or other players.
- This is a TEXT-based game, so DO NOT use or make up any non-textual information.
- Always critically reflect on whether your evidence exist, and avoid making assumptions.
- Your response should be specific and concise, provide clear reason and avoid unnecessary elaboration.
- Generate your one-line response by using the `generate_response` function.
- Don't repeat the others' speeches."""

prompt_zh = """你是一个名为{name}的狼人杀游戏玩家。

# 你的目标
你的目标是尽可能与你的队友一起赢得游戏。

# 游戏规则
- 在狼人杀游戏中，玩家分为三只狼人、三名村民、一名预言家、一名猎人和一名女巫。
    - 狼人：每晚杀死一名玩家，并在白天隐藏身份。
    - 村民：普通玩家，没有特殊能力，尝试识别并淘汰狼人。
        - 预言家：特殊村民，每晚可以查验一名玩家的身份。
        - 女巫：特殊村民，拥有两种一次性药水：解药可以拯救一名被狼人杀死的玩家，毒药可以消灭一名玩家。
        - 猎人：特殊村民，在被淘汰时可以带走一名玩家。
- 游戏在夜晚和白天阶段交替进行，直到一方获胜：
    - 夜晚阶段
        - 狼人选择一名受害者
        - 预言家查验一名玩家的身份
        - 女巫决定是否使用药水
        - 主持人宣布夜间死亡玩家
    - 白天阶段
        - 所有玩家讨论并投票淘汰一名可疑玩家

# 游戏指导
- 尽可能与你的队友一起赢得游戏，允许使用技巧、谎言和欺骗，例如假装成其他角色。
- 在讨论中，不要拐弯抹角，要直接切中要点。
- 白天阶段的投票提供重要线索。例如，狼人可能集体投票、攻击预言家等。
## 狼人游戏指导
- 预言家是你最大的威胁，他每晚可以查验一名玩家的身份。分析玩家的发言，找出预言家并淘汰他/她将大大提高你的胜率。
- 在第一夜，由于没有信息，狼人通常随机选择目标。
- 假装成其他角色（预言家、女巫或村民）是常见策略，以隐藏身份并误导其他村民。
- 夜晚阶段的结果提供重要线索。例如，女巫是否使用了解药或毒药，死亡玩家是否是猎人等。利用这些信息调整策略。
## 预言家游戏指导
- 预言家对村民非常重要，过早暴露可能导致被狼人针对。
- 你查验玩家身份的能力至关重要。
- 夜晚阶段的结果提供重要线索。例如，女巫是否使用了解药或毒药，死亡玩家是否是猎人等。利用这些信息调整策略。
## 女巫游戏指导
- 女巫拥有两种强大的药水，明智使用以保护关键村民或淘汰可疑狼人。
- 夜晚阶段的结果提供重要线索。例如，死亡玩家是否是猎人等。利用这些信息调整策略。
## 猎人游戏指导
- 在白天阶段使用你的能力会暴露你的角色（因为只有猎人可以带走一名玩家）
- 夜晚阶段的结果提供重要线索。例如，女巫是否使用了解药或毒药等。利用这些信息调整策略。
## 村民游戏指导
- 保护特殊村民，尤其是预言家，对你团队的胜利至关重要。
- 狼人可能假装成预言家。保持警惕，不要轻易信任任何人。
- 夜晚阶段的结果提供重要线索。例如，女巫是否使用了解药或毒药，死亡玩家是否是猎人等。利用这些信息调整策略。

# 注意
- [重要] 不要编造任何主持人或其他玩家未提供的信息。
- 这是一个基于文本的游戏，因此不要使用或编造任何非文本信息。
- 始终批判性反思你的证据是否存在，避免做出假设。
- 你的响应应具体且简洁，提供清晰的理由，避免不必要的阐述。
- 使用`generate_response`函数生成你的单行响应。
- 不要重复他人的发言。"""


def get_official_agents(name: str) -> ReActAgent:
    """Get the official werewolves game agents."""
    agent = ReActAgent(
        name=name,
        sys_prompt=prompt_zh.format(name=name),
        model=DashScopeChatModel(
            api_key=os.environ.get("DASHSCOPE_API_KEY"),
            model_name="qwen2.5-32b-instruct",
        ),
        formatter=DashScopeMultiAgentFormatter(),
    )

    # agent = ReActAgent(
    #     name=name,
    #     sys_prompt=prompt_zh.format(name=name),
    #     model=OpenAIChatModel(
    #         api_key="5a62d5a7216e4872b5581c2b1d235299.Jd0RQWYUSZhxDY8V",
    #         model_name="glm-4.5-air", 
    #         client_args={
    #             "base_url": "https://open.bigmodel.cn/api/paas/v4/",
    #         },
    #     ),
    #     formatter=OpenAIMultiAgentFormatter(),
    # )

    # agent = ReActAgent(
    #     name=name,
    #     sys_prompt=prompt_zh.format(name=name),
    #     model=OllamaChatModel(
    #         model_name="qwen2.5:1.5b", 
    #         # enable_thinking=False,
    #     ),
    #     formatter=OllamaMultiAgentFormatter(),
    # )
    return agent


async def main() -> None:
    """The main entry point for the werewolf game."""

    # Uncomment the following lines if you want to use Agentscope Studio
    # to visualize the game process.
    # import agentscope
    # agentscope.init(
    #     studio_url="http://localhost:3001",
    #     project="werewolf_game",
    # )

    # Prepare 9 players, you can change their names here
    players = [get_official_agents(f"Player{_ + 1}") for _ in range(9)]

    # Note: You can replace your own agents here, or use all your own agents

    # Load states from a previous checkpoint
    session = JSONSession(save_dir="./checkpoints")
    await session.load_session_state(
        session_id="players_checkpoint",
        **{player.name: player for player in players},
    )

    await werewolves_game(players)

    # Save the states to a checkpoint
    await session.save_session_state(
        session_id="players_checkpoint",
        **{player.name: player for player in players},
    )


asyncio.run(main())
