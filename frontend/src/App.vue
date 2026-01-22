<template>
  <div class="app">
    <div class="header">
      <Header
        :status-text="statusText"
        :phase-text="phaseText"
        :on-start-game="startGame"
        :on-stop-game="stopGame"
        :start-disabled="startingGame || isGameRunning"
        :start-label="startingGame ? '启动中…' : '开始游戏'"
        :stop-disabled="stoppingGame || !isGameRunning"
        :stop-label="stoppingGame ? '终止中…' : '终止游戏'"
        :on-export-log="exportLog"
        :export-log-disabled="exportingLog"
        :export-log-label="exportingLog ? '导出中…' : '导出日志'"
        :on-export-experience="exportExperience"
        :export-experience-disabled="exportingExperience"
        :export-experience-label="exportingExperience ? '导出中…' : '导出经验'"
      />
    </div>

    <div style="flex: 1; min-height: 0; display: flex;">
      <div style="width: 60%; min-width: 0; border-right: 1px solid #e0e0e0;">
        <RoomView
          :agents="agents"
          :bubbles="bubbles"
          :bubble-for="bubbleFor"
          :leaderboard="[]"
          :feed="feed"
          :phase-text="phaseText"
          :on-jump-to-message="handleJumpToMessage"
        />
      </div>
      <div style="width: 40%; min-width: 360px;">
        <GameFeed ref="feedRef" :feed="feed" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Header from "./components/Header.vue";
import RoomView from "./components/RoomView.vue";
import GameFeed from "./components/GameFeed.vue";

import { DEFAULT_AGENTS, API_URL, BUBBLE_LIFETIME_MS, ASSETS } from "./config/constants";
import { ReadOnlyClient } from "./services/websocket";
import { useFeedProcessor } from "./hooks/useFeedProcessor";

const extractBubbleText = (content) => {
  const text = String(content || "");
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
};

const connectionStatus = ref("connecting");
const phaseText = ref("准备中");
const startingGame = ref(false);
const stoppingGame = ref(false);
const exportingLog = ref(false);
const exportingExperience = ref(false);

const gameStatus = ref({ status: "idle", gameId: null, logPath: null, experiencePath: null });

const agents = ref([...DEFAULT_AGENTS]);

const getAgentById = (agentId) => {
  if (!agentId) return null;
  return agents.value.find((a) => a.id === agentId) || null;
};

const { feed, processHistoricalFeed, processFeedEvent, addSystemMessage } = useFeedProcessor({ getAgentById });

const bubbles = ref({});
const clientRef = ref(null);
const feedRef = ref(null);
const bubbleTimersRef = ref({});

const roleMetaFromRole = (role) => {
  const raw = String(role || "").toLowerCase();
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
};

const mapPlayerNameToAgentId = (name) => {
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
};

const applyPlayersInit = (players) => {
  if (!Array.isArray(players) || players.length === 0) return;

  const prev = agents.value.length ? agents.value : DEFAULT_AGENTS;
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
      alive: p?.alive !== false,
    });
  }

  const nextAgents = Array.from(byId.values()).sort((a, b) => {
    const na = Number(String(a.id).replace("player_", ""));
    const nb = Number(String(b.id).replace("player_", ""));
    return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0);
  });

  agents.value = nextAgents;
};

const markPlayersDead = (deadPlayerNames) => {
  if (!Array.isArray(deadPlayerNames) || deadPlayerNames.length === 0) return;

  agents.value = agents.value.map((agent) => {
    const isDead = deadPlayerNames.some((name) => {
      const deadId = mapPlayerNameToAgentId(name);
      return deadId === agent.id || name === agent.name || name === `${agent.name.replace("号", "")}号`;
    });
    if (isDead) {
      return { ...agent, alive: false };
    }
    return agent;
  });
};

const statusText = computed(() => {
  if (connectionStatus.value === "connected") return "已连接";
  if (connectionStatus.value === "disconnected") return "连接断开";
  return "连接中";
});

const isGameRunning = computed(() => String(gameStatus.value?.status || "").toLowerCase() === "running");

const refreshGameStatus = async () => {
  try {
    const res = await fetch(`${API_URL}/api/game/status`, { method: "GET" });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    if (!data) return;
    gameStatus.value = {
      status: data.status || "idle",
      gameId: data.gameId ?? null,
      logPath: data.logPath ?? null,
      experiencePath: data.experiencePath ?? null,
    };
  } catch {
    // ignore
  }
};

const downloadBlob = async (url, fallbackName) => {
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
};

const bubbleFor = (idOrName) => {
  if (!idOrName) return null;
  const direct = bubbles.value[idOrName];
  if (direct) return direct;

  const agent = agents.value.find((a) => a.id === idOrName || a.name === idOrName);
  if (!agent) return null;
  return bubbles.value[agent.id] || null;
};

const handleJumpToMessage = (bubble) => {
  if (feedRef.value?.scrollToMessage) {
    feedRef.value.scrollToMessage(bubble);
  }
};

const upsertBubbleFromMessage = (messageOrFeedItem) => {
  if (!messageOrFeedItem) return;

  const isFeedItem =
    typeof messageOrFeedItem === "object" &&
    messageOrFeedItem !== null &&
    Object.prototype.hasOwnProperty.call(messageOrFeedItem, "data") &&
    messageOrFeedItem.data;

  const msg = isFeedItem ? messageOrFeedItem.data : messageOrFeedItem;
  if (!msg || !msg.agentId) return;

  const agent = agents.value.find((a) => a.id === msg.agentId);
  const behaviorText = String(msg.behavior || "").trim();
  const speechTextRaw = String(msg.speech || "").trim();
  const contentTextRaw = String(msg.content || "").trim();
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

  bubbles.value = {
    ...bubbles.value,
    [msg.agentId]: bubble,
  };

  const timers = bubbleTimersRef.value;
  if (timers[msg.agentId]) {
    clearTimeout(timers[msg.agentId]);
  }
  timers[msg.agentId] = setTimeout(() => {
    if (!bubbles.value[msg.agentId]) return;
    const next = { ...bubbles.value };
    delete next[msg.agentId];
    bubbles.value = next;
    delete timers[msg.agentId];
  }, BUBBLE_LIFETIME_MS || 3000);
};

const startGame = async () => {
  if (startingGame.value) return;
  startingGame.value = true;
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
    startingGame.value = false;
  }
};

const stopGame = async () => {
  if (stoppingGame.value) return;
  stoppingGame.value = true;
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
    stoppingGame.value = false;
  }
};

const exportLog = async () => {
  if (exportingLog.value) return;
  exportingLog.value = true;
  try {
    await downloadBlob(`${API_URL}/api/exports/log`, "game.log");
    addSystemMessage("已导出最新游戏日志");
  } catch (e) {
    addSystemMessage(`导出日志失败: ${String(e?.message || e)}`);
  } finally {
    exportingLog.value = false;
  }
};

const exportExperience = async () => {
  if (exportingExperience.value) return;
  exportingExperience.value = true;
  try {
    await downloadBlob(`${API_URL}/api/exports/experience`, "experience.json");
    addSystemMessage("已导出最新经验文件");
  } catch (e) {
    addSystemMessage(`导出经验失败: ${String(e?.message || e)}`);
  } finally {
    exportingExperience.value = false;
  }
};

let statusTimer = null;

onMounted(() => {
  refreshGameStatus();
  statusTimer = setInterval(refreshGameStatus, 1500);

  const onEvent = (evt) => {
    if (!evt || !evt.type) return;

    if (evt.type === "system") {
      const content = String(evt.content || "");
      if (content.toLowerCase().includes("connected")) {
        connectionStatus.value = "connected";
      }
      if (content.toLowerCase().includes("try to connect")) {
        connectionStatus.value = "disconnected";
      }

      const category = String(evt.category || "");
      if ((category.includes("死亡") || content.includes("被淘汰")) && Array.isArray(evt.players)) {
        markPlayersDead(evt.players);
      }
    }

    if (evt.type === "system" && Array.isArray(evt.players)) {
      const category = String(evt.category || "");
      if (!category.includes("死亡")) {
        applyPlayersInit(evt.players);
      }
    }

    if (evt.type === "day_start") {
      phaseText.value = "白天";
    }
    if (evt.type === "night_start") {
      phaseText.value = "夜晚";
    }

    if (evt.type === "historical" && Array.isArray(evt.events)) {
      const playersInit = evt.events
        .filter((e) => e && e.type === "system" && Array.isArray(e.players) && !String(e.category || "").includes("死亡"))
        .map((e) => e.players)
        .pop();
      if (playersInit) {
        applyPlayersInit(playersInit);
      }

      const deathEvents = evt.events.filter(
        (e) => e && e.type === "system" && String(e.category || "").includes("死亡") && Array.isArray(e.players)
      );
      for (const deathEvt of deathEvents) {
        markPlayersDead(deathEvt.players);
      }

      processHistoricalFeed(evt.events);
      return;
    }

    processFeedEvent(evt);
    if (evt.type === "agent_message" || evt.type === "conference_message") {
      upsertBubbleFromMessage(evt);
    }
  };

  const client = new ReadOnlyClient(onEvent);
  clientRef.value = client;

  addSystemMessage("等待游戏开始…");
  client.connect();
});

onBeforeUnmount(() => {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }

  const timers = bubbleTimersRef.value || {};
  Object.keys(timers).forEach((k) => clearTimeout(timers[k]));
  bubbleTimersRef.value = {};

  if (clientRef.value) {
    try {
      clientRef.value.disconnect();
    } catch {
      // ignore
    }
  }
  clientRef.value = null;
});
</script>
