import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import GlobalStyles from "./styles/GlobalStyles";
import Header from "./components/Header";
import RoomView from "./components/RoomView";
import GameFeed from "./components/GameFeed";

import { DEFAULT_AGENTS, API_URL, BUBBLE_LIFETIME_MS, ASSETS } from "./config/constants";
import { ReadOnlyClient } from "./services/websocket";
import { useFeedProcessor } from "./hooks/useFeedProcessor";

const extractBubbleText = (content) => {
  const text = String(content || "");
  // Preserve newlines; only strip model <think> blocks.
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
};

export default function WolfMindApp() {
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting|connected|disconnected
  const [phaseText, setPhaseText] = useState("准备中");
  const [startingGame, setStartingGame] = useState(false);
  const [stoppingGame, setStoppingGame] = useState(false);
  const [exportingLog, setExportingLog] = useState(false);
  const [exportingExperience, setExportingExperience] = useState(false);

  const [gameStatus, setGameStatus] = useState({ status: "idle", gameId: null, logPath: null, experiencePath: null });

  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const agentsRef = useRef(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const getAgentById = useCallback((agentId) => {
    if (!agentId) return null;
    return agentsRef.current?.find((a) => a.id === agentId) || null;
  }, []);

  const { feed, processHistoricalFeed, processFeedEvent, addSystemMessage } = useFeedProcessor({ getAgentById });

  const [bubbles, setBubbles] = useState({});
  const clientRef = useRef(null);
  const feedRef = useRef(null);
  const bubbleTimersRef = useRef({});

  const roleMetaFromRole = useCallback((role) => {
    const raw = String(role || "").toLowerCase();
    // Normalize to internal role keys
    const isWerewolf = raw.includes("狼人") || raw.includes("werewolf");
    const isSeer = raw.includes("预言家") || raw.includes("seer") || raw.includes("prophet");
    const isWitch = raw.includes("女巫") || raw.includes("witch");
    const isHunter = raw.includes("猎人") || raw.includes("hunter");
    const isGuard = raw.includes("守卫") || raw.includes("guard") || raw.includes("bodyguard");
    const isVillager = raw.includes("平民") || raw.includes("villager") || raw.includes("村民");

    if (isWerewolf) {
      return {
        alignment: "werewolves",
        avatar: ASSETS.avatars.werewolf,
        colors: { bg: "#111827", text: "#F8FAFC", accent: "#F8FAFC" },
      };
    }
    if (isSeer) {
      return {
        alignment: "villagers",
        avatar: ASSETS.avatars.seer,
        colors: { bg: "#EEF2FF", text: "#3730A3", accent: "#3730A3" },
      };
    }
    if (isWitch) {
      return {
        alignment: "villagers",
        avatar: ASSETS.avatars.witch,
        colors: { bg: "#ECFEFF", text: "#0F766E", accent: "#0F766E" },
      };
    }
    if (isHunter) {
      return {
        alignment: "villagers",
        avatar: ASSETS.avatars.hunter,
        colors: { bg: "#FEF3C7", text: "#92400E", accent: "#92400E" },
      };
    }
    if (isGuard) {
      return {
        alignment: "villagers",
        avatar: ASSETS.avatars.guard,
        colors: { bg: "#ECFDF5", text: "#065F46", accent: "#065F46" },
      };
    }
    if (isVillager) {
      return {
        alignment: "villagers",
        avatar: ASSETS.avatars.villager,
        colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" },
      };
    }

    return {
      alignment: "unknown",
      avatar: ASSETS.avatars.villager,
      colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" },
    };
  }, []);

  const mapPlayerNameToAgentId = useCallback((name) => {
    const n = String(name || "");
    const lower = n.toLowerCase();
    if (lower.startsWith("player")) {
      const suffix = lower.slice(6);
      const num = Number(suffix);
      if (Number.isFinite(num) && num >= 1 && num <= 99) {
        return `player_${num}`;
      }
    }
    return null;
  }, []);

  const applyPlayersInit = useCallback(
    (players) => {
      if (!Array.isArray(players) || players.length === 0) return;

      const prev = agentsRef.current || DEFAULT_AGENTS;
      const byId = new Map((prev || []).map((a) => [a.id, a]));
      for (const p of players) {
        const agentId = mapPlayerNameToAgentId(p?.name);
        if (!agentId) continue;

        const base = byId.get(agentId) || { id: agentId, name: agentId };
        const seatNum = agentId.startsWith("player_") ? agentId.slice(7) : "";
        const meta = roleMetaFromRole(p?.role);
        byId.set(agentId, {
          ...base,
          id: agentId,
          name: seatNum ? `${Number(seatNum)}号` : base.name,
          role: String(p?.role || "未知"),
          alignment: meta.alignment,
          avatar: meta.avatar,
          colors: meta.colors,
          model: p?.model || base.model,
        });
      }
      const nextAgents = Array.from(byId.values()).sort((a, b) => {
        const na = Number(String(a.id).replace("player_", ""));
        const nb = Number(String(b.id).replace("player_", ""));
        return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0);
      });

      agentsRef.current = nextAgents;
      setAgents(nextAgents);
    },
    [mapPlayerNameToAgentId, roleMetaFromRole]
  );

  const statusText = useMemo(() => {
    if (connectionStatus === "connected") return "已连接";
    if (connectionStatus === "disconnected") return "连接断开";
    return "连接中";
  }, [connectionStatus]);

  const isGameRunning = useMemo(() => String(gameStatus?.status || "").toLowerCase() === "running", [gameStatus]);

  const refreshGameStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/game/status`, { method: "GET" });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data) return;
      setGameStatus({
        status: data.status || "idle",
        gameId: data.gameId ?? null,
        logPath: data.logPath ?? null,
        experiencePath: data.experiencePath ?? null,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshGameStatus();
    const t = setInterval(refreshGameStatus, 1500);
    return () => clearInterval(t);
  }, [refreshGameStatus]);

  const downloadBlob = useCallback(async (url, fallbackName) => {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${text || res.statusText}`.trim());
    }
    const blob = await res.blob();
    const cd = res.headers.get("content-disposition") || "";
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename = decodeURIComponent((m && (m[1] || m[2])) || fallbackName || "download");

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }, []);

  const bubbleFor = useCallback(
    (idOrName) => {
      if (!idOrName) return null;
      const direct = bubbles[idOrName];
      if (direct) return direct;

      const agent = agentsRef.current?.find((a) => a.id === idOrName || a.name === idOrName);
      if (!agent) return null;
      return bubbles[agent.id] || null;
    },
    [bubbles]
  );

  const handleJumpToMessage = useCallback((bubble) => {
    if (feedRef.current?.scrollToMessage) {
      feedRef.current.scrollToMessage(bubble);
    }
  }, []);

  const upsertBubbleFromMessage = useCallback((messageOrFeedItem) => {
    if (!messageOrFeedItem) return;

    // Both raw WS events and feed items contain a `type` field.
    // Only treat it as a feed item when it actually has a `data` payload.
    const isFeedItem =
      typeof messageOrFeedItem === "object" &&
      messageOrFeedItem !== null &&
      Object.prototype.hasOwnProperty.call(messageOrFeedItem, "data") &&
      messageOrFeedItem.data;

    const msg = isFeedItem ? messageOrFeedItem.data : messageOrFeedItem;
    if (!msg || !msg.agentId) return;

    const agent = agentsRef.current?.find((a) => a.id === msg.agentId);
    const behaviorText = String(msg.behavior || "").trim();
    const speechTextRaw = String(msg.speech || "").trim();
    const contentTextRaw = String(msg.content || "").trim();
    // 气泡只显示 behavior 和 speech，不显示 thought
    const hasStructured = Boolean(behaviorText || speechTextRaw);

    const lines = [];
    if (hasStructured) {
      if (behaviorText) {
        lines.push(`(表现) ${extractBubbleText(behaviorText)}`);
      }
      const speechText = speechTextRaw ? speechTextRaw : contentTextRaw;
      if (String(speechText || "").trim()) {
        lines.push(`(发言) ${extractBubbleText(speechText)}`);
      }
    }

    const bubble = {
      agentId: msg.agentId,
      agentName: msg.agentName || msg.agent || agent?.name,
      text: hasStructured ? lines.join("\n") : extractBubbleText(speechTextRaw || contentTextRaw),
      timestamp: msg.timestamp || Date.now(),
      ts: msg.timestamp || Date.now(),
      id: msg.id,
      feedItemId: msg.id,
    };

    setBubbles((prev) => ({
      ...prev,
      [msg.agentId]: bubble,
    }));

    // Auto-hide after a short time (keep feed intact)
    const timers = bubbleTimersRef.current;
    if (timers[msg.agentId]) {
      clearTimeout(timers[msg.agentId]);
    }
    timers[msg.agentId] = setTimeout(() => {
      setBubbles((prev) => {
        if (!prev[msg.agentId]) return prev;
        const next = { ...prev };
        delete next[msg.agentId];
        return next;
      });
      delete timers[msg.agentId];
    }, BUBBLE_LIFETIME_MS || 3000);
  }, []);

  useEffect(() => {
    return () => {
      const timers = bubbleTimersRef.current || {};
      for (const k of Object.keys(timers)) {
        clearTimeout(timers[k]);
      }
      bubbleTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const onEvent = (evt) => {
      if (!evt || !evt.type) return;

      if (evt.type === "system") {
        const content = String(evt.content || "");
        if (content.toLowerCase().includes("connected")) {
          setConnectionStatus("connected");
        }
        if (content.toLowerCase().includes("try to connect")) {
          setConnectionStatus("disconnected");
        }
      }

      // Backend sends role assignment in a system event (players list)
      if (evt.type === "system" && Array.isArray(evt.players)) {
        applyPlayersInit(evt.players);
      }

      if (evt.type === "day_start") {
        setPhaseText("白天");
      }
      if (evt.type === "night_start") {
        setPhaseText("夜晚");
      }

      if (evt.type === "historical" && Array.isArray(evt.events)) {
        // Historical snapshot may include the players init event; apply it first.
        const playersInit = evt.events
          .filter((e) => e && e.type === "system" && Array.isArray(e.players))
          .map((e) => e.players)
          .pop();
        if (playersInit) {
          applyPlayersInit(playersInit);
        }
        processHistoricalFeed(evt.events);
        return;
      }

      const processed = processFeedEvent(evt);
      // Feed items are processed for the right panel, but bubbles should be driven by the raw event
      // to avoid losing structured fields (thought/behavior/speech).
      if (evt.type === "agent_message" || evt.type === "conference_message") {
        upsertBubbleFromMessage(evt);
      }
    };

    const client = new ReadOnlyClient(onEvent);
    clientRef.current = client;

    addSystemMessage("等待游戏开始…");
    client.connect();

    return () => {
      try {
        client.disconnect();
      } catch {
        // ignore
      }
      clientRef.current = null;
    };
  }, [addSystemMessage, applyPlayersInit, processFeedEvent, processHistoricalFeed, upsertBubbleFromMessage]);

  const startGame = useCallback(async () => {
    if (startingGame) return;
    setStartingGame(true);
    try {
      addSystemMessage("正在请求后端开始游戏…");
      const res = await fetch(`${API_URL}/api/game/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        addSystemMessage(`开始游戏失败: ${res.status} ${text || res.statusText}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      addSystemMessage(`已开始游戏 (gameId=${data?.gameId || ""})`);
      refreshGameStatus();
    } catch (e) {
      addSystemMessage(`开始游戏失败: ${String(e?.message || e)}`);
    } finally {
      setStartingGame(false);
    }
  }, [addSystemMessage, refreshGameStatus, startingGame]);

  const stopGame = useCallback(async () => {
    if (stoppingGame) return;
    setStoppingGame(true);
    try {
      addSystemMessage("正在请求后端终止游戏…");
      const res = await fetch(`${API_URL}/api/game/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        addSystemMessage(`终止游戏失败: ${res.status} ${text || res.statusText}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      addSystemMessage(data?.message || "已请求终止游戏");
      refreshGameStatus();
    } catch (e) {
      addSystemMessage(`终止游戏失败: ${String(e?.message || e)}`);
    } finally {
      setStoppingGame(false);
    }
  }, [addSystemMessage, refreshGameStatus, stoppingGame]);

  const exportLog = useCallback(async () => {
    if (exportingLog) return;
    setExportingLog(true);
    try {
      await downloadBlob(`${API_URL}/api/exports/log`, "game.log");
      addSystemMessage("已导出最新游戏日志");
    } catch (e) {
      addSystemMessage(`导出日志失败: ${String(e?.message || e)}`);
    } finally {
      setExportingLog(false);
    }
  }, [addSystemMessage, downloadBlob, exportingLog]);

  const exportExperience = useCallback(async () => {
    if (exportingExperience) return;
    setExportingExperience(true);
    try {
      await downloadBlob(`${API_URL}/api/exports/experience`, "experience.json");
      addSystemMessage("已导出最新经验文件");
    } catch (e) {
      addSystemMessage(`导出经验失败: ${String(e?.message || e)}`);
    } finally {
      setExportingExperience(false);
    }
  }, [addSystemMessage, downloadBlob, exportingExperience]);

  return (
    <div className="app">
      <GlobalStyles />

      <div className="header">
        <Header
          statusText={statusText}
          phaseText={phaseText}
          onStartGame={startGame}
          onStopGame={stopGame}
          startDisabled={startingGame || isGameRunning}
          startLabel={startingGame ? "启动中…" : "开始游戏"}
          stopDisabled={stoppingGame || !isGameRunning}
          stopLabel={stoppingGame ? "终止中…" : "终止游戏"}
          onExportLog={exportLog}
          exportLogDisabled={exportingLog}
          exportLogLabel={exportingLog ? "导出中…" : "导出日志"}
          onExportExperience={exportExperience}
          exportExperienceDisabled={exportingExperience}
          exportExperienceLabel={exportingExperience ? "导出中…" : "导出经验"}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ width: "60%", minWidth: 0, borderRight: "1px solid #e0e0e0" }}>
          <RoomView
            agents={agents}
            bubbles={bubbles}
            bubbleFor={bubbleFor}
            leaderboard={[]}
            feed={feed}
            phaseText={phaseText}
            onJumpToMessage={handleJumpToMessage}
          />
        </div>
        <div style={{ width: "40%", minWidth: 360 }}>
          <GameFeed ref={feedRef} feed={feed} />
        </div>
      </div>
    </div>
  );
}
