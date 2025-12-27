# -*- coding: utf-8 -*-
"""WolfMind 的 FastAPI 服务端。

提供：
- POST /api/game/start  : 启动一局新游戏（以异步后台任务运行）
- GET  /api/game/status : 获取当前运行状态
- WS   /ws/game         : 实时推送结构化游戏事件

说明：游戏本体（LLM 智能体 + 引擎）在同一进程内运行；前端通过 WebSocket 订阅事件流。
"""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel

from game_service import run_game_session


def _new_game_id() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _map_agent_id(agent_name: str | None) -> str | None:
    if not agent_name:
        return None
    # 后端玩家名为 Player1..Player9；前端展示使用 player_1..player_9
    if agent_name.lower().startswith("player"):
        suffix = agent_name[6:]
        if suffix.isdigit():
            return f"player_{int(suffix)}"
    return agent_name


class EventBus:
    def __init__(self, *, buffer_size: int = 500):
        self._buffer: deque[dict[str, Any]] = deque(maxlen=buffer_size)
        self._subscribers: set[asyncio.Queue] = set()

    def publish(self, event: dict[str, Any]) -> None:
        # 若事件中含有玩家标识，则统一转换为前端使用的 agentId
        if "agentName" in event and "agentId" not in event:
            event["agentId"] = _map_agent_id(event.get("agentName"))
        elif "agentId" in event:
            event["agentId"] = _map_agent_id(event.get("agentId"))

        self._buffer.append(event)
        dead: list[asyncio.Queue] = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # 客户端过慢时丢弃该条推送，避免阻塞服务端
                continue
            except Exception:
                dead.append(q)
        for q in dead:
            self._subscribers.discard(q)

    def subscribe(self) -> tuple[asyncio.Queue, list[dict[str, Any]]]:
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._subscribers.add(q)
        # 前端期望 historical.events 为“最新在前”
        snapshot = list(self._buffer)
        snapshot.reverse()
        return q, snapshot

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)


@dataclass
class GameRuntime:
    status: str = "idle"  # idle|running|error（空闲|运行中|异常）
    game_id: str | None = None
    task: asyncio.Task | None = None
    log_path: str | None = None
    experience_path: str | None = None
    last_error: str | None = None


class StartGameResponse(BaseModel):
    gameId: str
    status: str
    wsUrl: str


class StopGameResponse(BaseModel):
    status: str
    gameId: str | None = None
    message: str


class StatusResponse(BaseModel):
    status: str
    gameId: str | None = None
    logPath: str | None = None
    experiencePath: str | None = None
    lastError: str | None = None


def create_app() -> FastAPI:
    app = FastAPI(title="WolfMind API", version="0.1.0")

    # 开发期 CORS（前端通常运行在 :5173）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    bus = EventBus()
    runtime = GameRuntime()

    async def _run_game(game_id: str) -> None:
        runtime.status = "running"
        runtime.game_id = game_id
        runtime.last_error = None
        runtime.log_path = None
        runtime.experience_path = None

        bus.publish(
            {"type": "system", "content": f"游戏启动中… (game_id={game_id})"})

        try:
            log_path, experience_path = await run_game_session(game_id=game_id, event_sink=bus.publish)
            runtime.log_path = log_path
            runtime.experience_path = experience_path
            bus.publish(
                {
                    "type": "system",
                    "content": f"游戏结束。日志: {log_path}，经验: {experience_path}",
                    "logPath": log_path,
                    "experiencePath": experience_path,
                }
            )
            runtime.status = "idle"
        except asyncio.CancelledError:
            # 被显式终止（例如前端点击“终止游戏”）
            runtime.status = "idle"
            bus.publish({"type": "system", "content": "游戏已终止"})
            return
        except Exception as exc:  # noqa: BLE001
            runtime.status = "error"
            runtime.last_error = str(exc)
            bus.publish({"type": "day_error", "content": f"游戏异常终止: {exc}"})

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/", response_class=PlainTextResponse)
    async def root() -> str:
        return "WolfMind 后端已启动。访问 /docs 查看接口文档，或调用 /api/game/start 开始游戏。"

    @app.get("/favicon.ico")
    async def favicon() -> Response:
        # 浏览器通常会自动请求 favicon；这里返回空内容避免日志出现 404
        return Response(content=b"", media_type="image/x-icon")

    @app.get("/api/game/status", response_model=StatusResponse)
    async def game_status() -> StatusResponse:
        return StatusResponse(
            status=runtime.status,
            gameId=runtime.game_id,
            logPath=runtime.log_path,
            experiencePath=runtime.experience_path,
            lastError=runtime.last_error,
        )

    @app.post("/api/game/start", response_model=StartGameResponse)
    async def start_game() -> StartGameResponse:
        if runtime.task and not runtime.task.done():
            raise HTTPException(
                status_code=409, detail="A game is already running")

        game_id = _new_game_id()
        runtime.task = asyncio.create_task(_run_game(game_id))

        # 通知已连接的 WS 客户端
        bus.publish({"type": "system", "content": "已收到开始游戏请求"})

        return StartGameResponse(gameId=game_id, status="running", wsUrl="/ws/game")

    @app.post("/api/game/stop", response_model=StopGameResponse)
    async def stop_game() -> StopGameResponse:
        # 无运行任务时直接返回
        if not runtime.task or runtime.task.done():
            runtime.status = "idle"
            return StopGameResponse(status=runtime.status, gameId=runtime.game_id, message="当前没有运行中的游戏")

        # 取消后台任务
        bus.publish({"type": "system", "content": "已收到终止游戏请求"})
        runtime.task.cancel()

        # 尝试等待任务快速收尾（避免状态卡在 running）
        try:
            await asyncio.wait_for(runtime.task, timeout=2.0)
        except asyncio.TimeoutError:
            # 超时不阻塞接口返回
            pass
        except asyncio.CancelledError:
            pass
        except Exception as exc:  # noqa: BLE001
            runtime.status = "error"
            runtime.last_error = str(exc)

        # 兜底：确保状态回到 idle
        if runtime.status == "running":
            runtime.status = "idle"

        return StopGameResponse(status=runtime.status, gameId=runtime.game_id, message="已请求终止游戏")

    @app.websocket("/ws/game")
    async def ws_game(ws: WebSocket) -> None:
        await ws.accept()

        q, snapshot = bus.subscribe()
        try:
            # 先发送历史缓冲（回放）
            if snapshot:
                await ws.send_json({"type": "historical", "events": snapshot})

            while True:
                # 同时等待：客户端消息（用于 ping）或服务端新事件
                try:
                    recv_task = asyncio.create_task(ws.receive_text())
                    send_task = asyncio.create_task(q.get())
                    done, pending = await asyncio.wait(
                        {recv_task, send_task}, return_when=asyncio.FIRST_COMPLETED
                    )
                    for p in pending:
                        p.cancel()

                    for d in done:
                        if d is recv_task:
                            raw = d.result()
                            # 基础 ping/pong
                            if raw:
                                try:
                                    import json

                                    msg = json.loads(raw)
                                    if isinstance(msg, dict) and msg.get("type") == "ping":
                                        await ws.send_json({"type": "pong"})
                                except Exception:
                                    # 忽略非 JSON 文本
                                    pass
                        else:
                            event = d.result()
                            await ws.send_json(event)
                except WebSocketDisconnect:
                    break
        finally:
            bus.unsubscribe(q)

    return app


app = create_app()
