# -*- coding: utf-8 -*-
"""格式化的 JSON Session 类，输出可读的 JSON 文件。"""
import json
import os

from agentscope.session import JSONSession
from agentscope.module import StateModule


class FormattedJSONSession(JSONSession):
    """继承 JSONSession，覆盖保存方法以输出格式化的 JSON。"""

    async def save_session_state(
        self,
        session_id: str,
        **state_modules_mapping: StateModule,
    ) -> None:
        """保存状态到格式化的 JSON 文件。

        Args:
            session_id (`str`):
                会话 ID。
            **state_modules_mapping (`dict[str, StateModule]`):
                状态模块名称到实例的映射字典。
        """
        state_dicts = {
            name: state_module.state_dict()
            for name, state_module in state_modules_mapping.items()
        }
        os.makedirs(self.save_dir, exist_ok=True)
        with open(
            self._get_save_path(session_id),
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(state_dicts, file, ensure_ascii=False, indent=2)
