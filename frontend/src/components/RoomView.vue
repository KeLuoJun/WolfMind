<template>
  <div class="room-view">
    <div class="room-agents-indicator">
      <template v-for="agent in agents" :key="agent.id">
        <div
          class="agent-indicator"
          :class="{
            speaking: speakingAgents[agent.id],
            hovered: hoveredAgent === agent.id,
            dead: agent.alive === false
          }"
          @click="handleAgentClick(agent.id)"
          @mouseenter="handleTopAgentMouseEnter(agent.id)"
          @mouseleave="handleTopAgentMouseLeave"
        >
          <div class="agent-avatar-wrapper">
            <img
              :src="agent.avatar"
              :alt="agent.name"
              class="agent-avatar"
              :style="{
                filter: agent.alive === false ? 'grayscale(100%) brightness(0.7)' : 'none',
                opacity: agent.alive === false ? 0.6 : 1,
              }"
            />
            <span class="agent-indicator-dot" :style="{ display: agent.alive === false ? 'none' : 'block' }" />
            <span
              v-if="agent.alive === false"
              class="agent-dead-mark"
              style="
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #ef4444;
                border: 2px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #ffffff;
                font-weight: bold;
              "
            >
              ✕
            </span>
            <span v-if="getAgentRank(agent.id)" class="agent-rank-medal">
              {{ getRankMedal(getAgentRank(agent.id)) }}
            </span>
            <img
              v-if="getModelIcon(getAgentData(agent.id)?.modelName, getAgentData(agent.id)?.modelProvider).logoPath"
              :src="getModelIcon(getAgentData(agent.id)?.modelName, getAgentData(agent.id)?.modelProvider).logoPath"
              :alt="getModelIcon(getAgentData(agent.id)?.modelName, getAgentData(agent.id)?.modelProvider).provider"
              class="agent-model-badge"
              style="
                position: absolute;
                top: -12px;
                right: -12px;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                background: #ffffff;
                object-fit: contain;
                padding: 2px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                pointer-events: none;
              "
            />
          </div>
          <span class="agent-name" :style="{ color: agent.alive === false ? '#9ca3af' : '#111827' }">
            {{ agent.name }}
          </span>
        </div>
      </template>

      <div class="agent-hint-text">点击头像查看身份信息</div>

      <div v-if="hoveredTopAgentId" class="room-insights-popover" role="dialog" aria-label="Player insights">
        <div class="room-insights-title">
          {{ agents.find((a) => a.id === hoveredTopAgentId)?.name || hoveredTopAgentId }}
        </div>

        <div v-if="playersInsightsError" class="room-insights-empty">{{ playersInsightsError }}</div>
        <div v-else-if="!playersInsights" class="room-insights-empty">Loading…</div>
        <template v-else>
          <div class="room-insights-section">
            <div class="room-insights-section-title">对其他玩家的印象</div>
            <div v-if="insightImpressions.length === 0" class="room-insights-empty">暂无印象。</div>
            <div v-else class="room-insights-list">
              <div v-for="[other, text] in insightImpressions" :key="other" class="room-insights-row">
                <div class="room-insights-key">{{ other }}</div>
                <div class="room-insights-val">{{ text }}</div>
              </div>
            </div>
          </div>

          <div class="room-insights-section">
            <div class="room-insights-section-title">学习到的经验</div>
            <div v-if="insightKnowledge" class="room-insights-text">{{ insightKnowledge }}</div>
            <div v-else class="room-insights-empty">暂无学习到的经验。</div>
          </div>
        </template>
      </div>
    </div>

    <div class="room-canvas-container" ref="containerRef">
      <div class="room-scene">
        <div
          class="room-scene-wrapper"
          :class="sceneMode === 'day' ? 'is-day' : 'is-night'"
          :style="{
            position: 'relative',
            width: Math.round(SCENE_NATIVE.width * scale),
            height: Math.round(SCENE_NATIVE.height * scale),
          }"
        >
          <div class="room-background-layer">
            <div class="sky-gradient" />

            <div class="stars-layer">
              <div
                v-for="i in 80"
                :key="i"
                :class="`star star-${(i - 1) % 3}`"
                :style="{
                  left: `${(((i - 1) * 13.7 + (i - 1) * (i - 1) * 0.3) % 100)}%`,
                  top: `${(((i - 1) * 7.3 + (i - 1) * 0.5) % 60)}%`,
                  animationDelay: `${(((i - 1) * 0.1) % 3)}s`,
                }"
              />
            </div>

            <div class="shooting-stars">
              <div class="shooting-star shooting-star-1" />
              <div class="shooting-star shooting-star-2" />
              <div class="shooting-star shooting-star-3" />
            </div>

            <div class="clouds-layer">
              <div class="cloud cloud-1" />
              <div class="cloud cloud-2" />
              <div class="cloud cloud-3" />
              <div class="cloud cloud-4" />
            </div>

            <div class="birds-layer">
              <div class="bird bird-1">
                <div class="bird-body" />
              </div>
              <div class="bird bird-2">
                <div class="bird-body" />
              </div>
              <div class="bird bird-3">
                <div class="bird-body" />
              </div>
            </div>

            <div class="ground-layer" />
            <div class="horizon-glow" />

            <div class="fireflies-layer">
              <div
                v-for="i in 15"
                :key="i"
                class="firefly"
                :style="{
                  left: `${10 + ((i - 1) * 17) % 80}%`,
                  top: `${50 + ((i - 1) * 11) % 45}%`,
                  animationDelay: `${(((i - 1) * 0.4) % 4)}s`,
                  animationDuration: `${3 + ((i - 1) % 3)}s`,
                }"
              />
            </div>
          </div>

          <div class="room-celestial-layer" aria-hidden="true">
            <div class="room-celestial room-celestial-sun">
              <div class="sun-rays" />
            </div>
            <div class="room-celestial room-celestial-moon" />
          </div>

          <template v-for="entry in agentSeats" :key="entry.agent.id">
            <div
              :style="{
                position: 'absolute',
                left: entry.left + 'px',
                top: entry.top + 'px',
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none',
                opacity: entry.agent.alive === false ? 0.7 : 1,
              }"
              @click="handleAgentClick(entry.agent.id)"
              @mouseenter="handleAgentMouseEnter(entry.agent.id)"
              @mouseleave="handleAgentMouseLeave"
            >
              <div style="position: relative;">
                <img
                  :src="entry.agent.avatar"
                  :alt="entry.agent.name"
                  :style="{
                    width: '60px',
                    height: '60px',
                    borderRadius: '999px',
                    border: entry.agent.alive === false ? '2px solid #666666' : '2px solid #000000',
                    background: 'rgba(255, 255, 255, 0.10)',
                    boxShadow: speakingAgents[entry.agent.id]
                      ? '0 0 0 4px rgba(97, 92, 237, 0.35)'
                      : '0 4px 10px rgba(0, 0, 0, 0.10)',
                    filter: entry.agent.alive === false ? 'grayscale(100%) brightness(0.7)' : 'none',
                  }"
                />
                <div
                  v-if="entry.agent.alive === false"
                  :style="{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#ffffff',
                    fontWeight: 'bold',
                  }"
                >
                  ✕
                </div>
              </div>
              <div
                :style="{
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'IBM Plex Mono, monospace',
                  background: entry.agent.alive === false ? '#e5e5e5' : '#ffffff',
                  border: entry.agent.alive === false ? '2px solid #888888' : '2px solid #000000',
                  color: entry.agent.alive === false ? '#666666' : '#000000',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  boxShadow: '2px 2px 0 0 rgba(0,0,0,0.1)'
                }"
              >
                {{ entry.agent.name }}
              </div>
            </div>
          </template>

          <template v-for="entry in agentBubbles" :key="entry.bubbleKey">
            <div
              :style="{
                position: 'absolute',
                left: entry.left + 'px',
                top: entry.top + 'px',
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
              }"
            >
              <div
                class="room-bubble"
                :class="entry.isLeftSide ? 'room-bubble--left' : 'room-bubble--right'"
                :style="{
                  position: 'absolute',
                  bottom: 0,
                  left: entry.isLeftSide ? '50px' : 'auto',
                  right: entry.isLeftSide ? 'auto' : '50px',
                }"
              >
                <div
                  class="bubble-player-tag"
                  :style="{
                    position: 'absolute',
                    top: '-22px',
                    [entry.isLeftSide ? 'left' : 'right']: '0',
                    background: '#615CED',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '6px 6px 0 0',
                    fontFamily: 'IBM Plex Mono, monospace',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 -2px 4px rgba(97, 92, 237, 0.2)',
                  }"
                >
                  {{ entry.agent.name }}
                </div>

                <div
                  :style="{
                    position: 'absolute',
                    bottom: '20px',
                    [entry.isLeftSide ? 'left' : 'right']: '-25px',
                    width: '25px',
                    height: '3px',
                    background: '#615CED',
                    borderRadius: '2px',
                  }"
                />
                <div
                  :style="{
                    position: 'absolute',
                    bottom: '16px',
                    [entry.isLeftSide ? 'left' : 'right']: '-32px',
                    width: '10px',
                    height: '10px',
                    background: '#615CED',
                    borderRadius: '50%',
                    boxShadow: '0 0 0 3px rgba(97, 92, 237, 0.3)',
                  }"
                />

                <div class="bubble-action-buttons">
                  <button class="bubble-jump-btn" @click.stop="handleJumpToFeed(entry.bubble)" title="Jump to message in feed">
                    ↗
                  </button>
                  <button
                    class="bubble-close-btn"
                    @click.stop="handleCloseBubble(entry.agent.id, entry.bubbleKey, $event)"
                    title="Close bubble"
                  >
                    ×
                  </button>
                </div>

                <div class="room-bubble-header">
                  <img
                    v-if="entry.modelInfo.logoPath"
                    :src="entry.modelInfo.logoPath"
                    :alt="entry.modelInfo.provider"
                    class="bubble-model-icon"
                  />
                  <div class="room-bubble-name">{{ entry.bubble.agentName || entry.agent.name }}</div>
                </div>

                <div class="room-bubble-divider"></div>

                <div class="room-bubble-content">
                  {{ entry.bubble.text }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <template v-if="selectedAgent">
        <div class="agent-card-overlay" @click="handleClose" />
        <AgentCard :agent="selectedAgent" :is-closing="isClosing" />
      </template>

      <div
        v-if="modeTransition === 'entering-replay'"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
          zIndex: 40,
          clipPath: 'inset(0 100% 0 0)',
          animation: 'clipReveal 0.5s ease-out forwards'
        }"
      />

      <div
        v-if="modeTransition === 'exiting-replay'"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
          zIndex: 40,
          clipPath: 'inset(0 0 0 0)',
          animation: 'clipHide 0.5s ease-out forwards'
        }"
      />

      <div v-if="showReplayButton" class="replay-button-container">
        <button class="replay-button" @click="handleReplayClick" title="Replay feed history">
          <span class="replay-icon">&#9654;&#9654;</span>
          <span>REPLAY</span>
        </button>
      </div>

      <template v-if="isReplaying && !modeTransition">
        <div
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
            pointerEvents: 'none',
            zIndex: 40
          }"
        />
        <div class="replay-indicator">
          <span class="replay-status">{{ isPaused ? 'PAUSED' : 'REPLAY MODE' }}</span>
          <button class="replay-button" @click="isPaused ? resumeReplay() : pauseReplay()" style="padding: 6px 12px;">
            <span>{{ isPaused ? '▶' : '⏸' }}</span>
          </button>
          <button class="replay-button" @click="stopReplay" style="padding: 6px 12px;">
            <span>■</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, toRefs } from "vue";
import { SCENE_NATIVE, AGENT_SEATS, API_URL } from "../config/constants";
import AgentCard from "./AgentCard.vue";
import { getModelIcon } from "../utils/modelIcons";

const INSIGHTS_CACHE_TTL_MS = 10000;

const props = defineProps({
  agents: { type: Array, default: () => [] },
  bubbles: { type: Object, default: () => ({}) },
  bubbleFor: { type: Function, default: null },
  leaderboard: { type: Array, default: () => [] },
  feed: { type: Array, default: () => [] },
  onJumpToMessage: { type: Function, default: null },
  phaseText: { type: String, default: "" },
});

const { agents, bubbles, leaderboard, feed, onJumpToMessage, phaseText } = toRefs(props);

const containerRef = ref(null);

const sceneMode = computed(() => {
  const t = String(phaseText.value || "").toLowerCase();
  if (t.includes("夜")) return "night";
  if (t.includes("白")) return "day";
  return "night";
});

const seatIndexForAgent = (agent, fallbackIdx) => {
  const id = String(agent?.id || "");
  const name = String(agent?.name || "");
  let n = Number.NaN;
  if (id.startsWith("player_")) {
    n = Number(id.slice(7));
  }
  if (!Number.isFinite(n)) {
    const m = name.match(/(\d+)/);
    if (m) n = Number(m[1]);
  }
  if (Number.isFinite(n) && n >= 1 && n <= 9) return n - 1;
  return fallbackIdx ?? 0;
};

const selectedAgent = ref(null);
const hoveredAgent = ref(null);
const hoveredTopAgentId = ref(null);
const playersInsights = ref(null);
const playersInsightsError = ref(null);
const insightsCacheRef = ref({ at: 0, data: null });
const isClosing = ref(false);
const hoverTimerRef = ref(null);
const closeTimerRef = ref(null);

const fetchPlayersInsights = async () => {
  const now = Date.now();
  if (insightsCacheRef.value.data && now - insightsCacheRef.value.at < INSIGHTS_CACHE_TTL_MS) {
    return insightsCacheRef.value.data;
  }

  try {
    playersInsightsError.value = null;
    const res = await fetch(`${API_URL}/api/players/insights`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    insightsCacheRef.value = { at: now, data };
    playersInsights.value = data;
    return data;
  } catch (e) {
    const msg = e?.message || "Failed to load insights";
    playersInsightsError.value = msg;
    playersInsights.value = null;
    return null;
  }
};

const expandedBubbles = ref({});
const hiddenBubbles = ref({});

const handleCloseBubble = (agentId, bubbleKey, e) => {
  e.stopPropagation();
  hiddenBubbles.value = {
    ...hiddenBubbles.value,
    [bubbleKey]: true,
  };
};

const isReplaying = ref(false);
const replayBubbles = ref({});
const modeTransition = ref(null);
const isPaused = ref(false);
const replayTimerRef = ref(null);
const replayTimeoutsRef = ref([]);
const replayStateRef = ref({ messages: [], currentIndex: 0 });

const scale = ref(1.0);
let resizeObserver = null;
const updateScale = () => {
  const container = containerRef.value;
  if (!container) return;

  const { clientWidth, clientHeight } = container;
  if (clientWidth <= 0 || clientHeight <= 0) return;

  const scaleX = clientWidth / SCENE_NATIVE.width;
  const scaleY = clientHeight / SCENE_NATIVE.height;

  const maxScale = 1.55;
  const fitScale = Math.min(scaleX, scaleY);
  const newScale = Math.min(fitScale * 1.06, maxScale);
  scale.value = Math.max(0.45, newScale);
};

onMounted(() => {
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  window.addEventListener("resize", updateScale);
});

const speakingAgents = computed(() => {
  const speaking = {};
  agents.value.forEach((agent) => {
    const bubble = props.bubbleFor ? props.bubbleFor(agent.name) : null;
    speaking[agent.id] = !!bubble;
  });
  return speaking;
});

const getAgentData = (agentId) => {
  const agent = agents.value.find((a) => a.id === agentId);
  if (!agent) return null;

  if (!leaderboard.value || !Array.isArray(leaderboard.value)) {
    return {
      ...agent,
      bull: { n: 0, win: 0, unknown: 0 },
      bear: { n: 0, win: 0, unknown: 0 },
      winRate: null,
      signals: [],
      rank: null,
    };
  }

  const leaderboardData = leaderboard.value.find((lb) => lb.agentId === agentId);

  if (!leaderboardData) {
    return {
      ...agent,
      bull: { n: 0, win: 0, unknown: 0 },
      bear: { n: 0, win: 0, unknown: 0 },
      winRate: null,
      signals: [],
      rank: null,
    };
  }

  return {
    ...agent,
    ...leaderboardData,
    avatar: agent.avatar,
  };
};

const getAgentRank = (agentId) => {
  const agentData = getAgentData(agentId);
  return agentData?.rank || null;
};

const handleAgentClick = (agentId) => {
  if (closeTimerRef.value) {
    clearTimeout(closeTimerRef.value);
    closeTimerRef.value = null;
  }
  isClosing.value = false;

  const agentData = getAgentData(agentId);
  if (agentData) {
    selectedAgent.value = agentData;
  }
};

const handleAgentMouseEnter = (agentId) => {
  hoveredAgent.value = agentId;
  if (hoverTimerRef.value) {
    clearTimeout(hoverTimerRef.value);
    hoverTimerRef.value = null;
  }
  if (closeTimerRef.value) {
    clearTimeout(closeTimerRef.value);
    closeTimerRef.value = null;
  }
  isClosing.value = false;
};

const handleAgentMouseLeave = () => {
  hoveredAgent.value = null;
  if (hoverTimerRef.value) {
    clearTimeout(hoverTimerRef.value);
    hoverTimerRef.value = null;
  }
};

const handleTopAgentMouseEnter = async (agentId) => {
  hoveredAgent.value = agentId;
  hoveredTopAgentId.value = agentId;
  await fetchPlayersInsights();
};

const handleTopAgentMouseLeave = () => {
  hoveredAgent.value = null;
  hoveredTopAgentId.value = null;
};

const handleClose = () => {
  isClosing.value = true;
  closeTimerRef.value = setTimeout(() => {
    selectedAgent.value = null;
    isClosing.value = false;
    closeTimerRef.value = null;
  }, 200);
};

const showReplayButton = computed(() => !isReplaying.value && feed.value && feed.value.length > 0);

const handleReplayClick = () => {
  if (!feed.value || feed.value.length === 0) return;
  startReplay(feed.value);
};

const extractAgentMessages = (feedItems) => {
  const messages = [];

  feedItems.forEach((item) => {
    if (item.type === "message" && item.data) {
      const msg = item.data;
      if (msg.agent === "System") return;
      const agent = agents.value.find((a) => a.id === msg.agentId || a.name === msg.agent);
      if (agent) {
        messages.push({
          feedItemId: item.id,
          agentId: agent.id,
          agentName: agent.name,
          content: msg.content,
          timestamp: msg.timestamp,
        });
      }
    } else if (item.type === "conference" && item.data?.messages) {
      item.data.messages.forEach((msg) => {
        if (msg.agent === "System") return;
        const agent = agents.value.find((a) => a.id === msg.agentId || a.name === msg.agent);
        if (agent) {
          messages.push({
            feedItemId: item.id,
            agentId: agent.id,
            agentName: agent.name,
            content: msg.content,
            timestamp: msg.timestamp,
          });
        }
      });
    }
  });

  return messages;
};

const showNextMessage = () => {
  const { messages, currentIndex } = replayStateRef.value;
  if (currentIndex >= messages.length) {
    modeTransition.value = "exiting-replay";
    setTimeout(() => {
      modeTransition.value = null;
      isReplaying.value = false;
      isPaused.value = false;
      replayBubbles.value = {};
      replayStateRef.value = { messages: [], currentIndex: 0 };
    }, 500);
    return;
  }

  const msg = messages[currentIndex];
  const bubbleId = `replay_${msg.agentId}_${currentIndex}`;

  replayBubbles.value = {
    ...replayBubbles.value,
    [bubbleId]: {
      id: bubbleId,
      feedItemId: msg.feedItemId,
      agentId: msg.agentId,
      agentName: msg.agentName,
      text: msg.content,
      timestamp: msg.timestamp,
      ts: msg.timestamp,
    },
  };

  const hideTimeout = setTimeout(() => {
    const next = { ...replayBubbles.value };
    delete next[bubbleId];
    replayBubbles.value = next;
  }, 10000);
  replayTimeoutsRef.value.push(hideTimeout);

  replayStateRef.value.currentIndex = currentIndex + 1;
  const nextTimeout = setTimeout(() => {
    showNextMessage();
  }, 6000);
  replayTimerRef.value = nextTimeout;
  replayTimeoutsRef.value.push(nextTimeout);
};

const startReplay = (feedItems) => {
  if (!feedItems || feedItems.length === 0) return;

  const agentMessages = extractAgentMessages(feedItems).reverse();
  if (agentMessages.length === 0) return;

  replayStateRef.value = { messages: agentMessages, currentIndex: 0 };

  modeTransition.value = "entering-replay";
  isReplaying.value = true;
  isPaused.value = false;
  replayBubbles.value = {};

  replayTimeoutsRef.value.forEach((timeoutId) => clearTimeout(timeoutId));
  replayTimeoutsRef.value = [];

  setTimeout(() => {
    modeTransition.value = null;
    showNextMessage();
  }, 500);
};

const pauseReplay = () => {
  if (replayTimerRef.value) {
    clearTimeout(replayTimerRef.value);
    replayTimerRef.value = null;
  }
  isPaused.value = true;
};

const resumeReplay = () => {
  isPaused.value = false;
  showNextMessage();
};

const stopReplay = () => {
  replayTimeoutsRef.value.forEach((timeoutId) => clearTimeout(timeoutId));
  replayTimeoutsRef.value = [];

  if (replayTimerRef.value) {
    clearTimeout(replayTimerRef.value);
    replayTimerRef.value = null;
  }

  modeTransition.value = "exiting-replay";
  setTimeout(() => {
    modeTransition.value = null;
    isReplaying.value = false;
    isPaused.value = false;
    replayBubbles.value = {};
    replayStateRef.value = { messages: [], currentIndex: 0 };
  }, 500);
};

const getBubbleForAgent = (agentId) => {
  if (!agentId) return null;
  if (isReplaying.value) {
    return Object.values(replayBubbles.value).find((b) => b && b.agentId === agentId) || null;
  }
  return props.bubbleFor ? props.bubbleFor(agentId) : null;
};

const agentSeats = computed(() => {
  const scaledWidth = SCENE_NATIVE.width * scale.value;
  const scaledHeight = SCENE_NATIVE.height * scale.value;

  return agents.value.map((agent, idx) => {
    const seatIdx = seatIndexForAgent(agent, idx);
    const pos = AGENT_SEATS[seatIdx] || AGENT_SEATS[0];
    const left = Math.round(pos.x * scaledWidth);
    const top = Math.round(scaledHeight - pos.y * scaledHeight);

    return {
      agent,
      seatIdx,
      left,
      top,
      pos,
    };
  });
});

const agentBubbles = computed(() => {
  const scaledWidth = SCENE_NATIVE.width * scale.value;
  const scaledHeight = SCENE_NATIVE.height * scale.value;

  return agents.value
    .map((agent, idx) => {
      const bubble = getBubbleForAgent(agent.id);
      if (!bubble) return null;

      const bubbleKey = `${agent.id}_${bubble.timestamp || bubble.id || bubble.ts}`;
      if (hiddenBubbles.value[bubbleKey]) return null;

      const seatIdx = seatIndexForAgent(agent, idx);
      const pos = AGENT_SEATS[seatIdx] || AGENT_SEATS[0];
      const left = Math.round(pos.x * scaledWidth);
      const top = Math.round(scaledHeight - pos.y * scaledHeight);
      const isLeftSide = pos.x < 0.5;
      const agentData = getAgentData(agent.id);
      const modelInfo = getModelIcon(agentData?.modelName, agentData?.modelProvider);

      return {
        agent,
        bubble,
        bubbleKey,
        left,
        top,
        isLeftSide,
        modelInfo,
      };
    })
    .filter(Boolean);
});

const insightImpressions = computed(() => {
  const p = playersInsights.value?.players?.[hoveredTopAgentId.value];
  const impressions = p?.impressions || {};
  return Object.entries(impressions).filter(([, v]) => String(v || "").trim().length > 0);
});

const insightKnowledge = computed(() => {
  const p = playersInsights.value?.players?.[hoveredTopAgentId.value];
  return String(p?.knowledge || "").trim();
});

const handleJumpToFeed = (bubble) => {
  if (onJumpToMessage.value) {
    onJumpToMessage.value(bubble);
  }
};

const getRankMedal = (rank) => {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

onBeforeUnmount(() => {
  if (hoverTimerRef.value) {
    clearTimeout(hoverTimerRef.value);
  }
  if (closeTimerRef.value) {
    clearTimeout(closeTimerRef.value);
  }
  if (replayTimerRef.value) {
    clearTimeout(replayTimerRef.value);
  }
  replayTimeoutsRef.value.forEach((timeoutId) => clearTimeout(timeoutId));
  replayTimeoutsRef.value = [];
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener("resize", updateScale);
});
</script>
