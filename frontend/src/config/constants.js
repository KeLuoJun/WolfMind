/**
 * WolfMind Frontend Constants (Werewolf)
 * The UI is a single-page "werewolf room" + event feed.
 */

export const ASSETS = {
  logo: "/wolfmind_logo.svg",
  roomBg: "/room_bg_night.svg",
  roomBgDay: "/room_bg_day.svg",
  avatars: {
    villager: "/avatars/villager.svg",
    werewolf: "/avatars/werewolf.svg",
    seer: "/avatars/seer.svg",
    witch: "/avatars/witch.svg",
    hunter: "/avatars/hunter.svg",
    guard: "/avatars/guard.svg",
  },
};

// Kept for compatibility with existing utilities (unused in WolfMind UI)
export const LLM_MODEL_LOGOS = {};

// Scene dimensions (actual image size)
export const SCENE_NATIVE = { width: 1248, height: 832 };

// Seat positions (ratio relative to scene size, origin at bottom-left)
// Format: { x: 0..1, y: 0..1 from bottom }
// UX: players sit on two sides (left: 5 players, right: 4 players).
// Seat index maps to player number-1 (player_1 -> index 0, ..., player_9 -> index 8).
// Right side players (6-9) are horizontally aligned with left side players (2-5).
export const AGENT_SEATS = [
  // Left side (5) - 1号到5号
  { x: 0.09, y: 0.82 }, // 1号 - 最上方，无对应右侧玩家
  { x: 0.09, y: 0.64 }, // 2号 - 与6号对齐
  { x: 0.09, y: 0.46 }, // 3号 - 与7号对齐
  { x: 0.09, y: 0.28 }, // 4号 - 与8号对齐
  { x: 0.09, y: 0.10 }, // 5号 - 与9号对齐

  // Right side (4) - 6号到9号，与左侧2-5号水平对齐
  { x: 0.91, y: 0.64 }, // 6号 - 与2号对齐
  { x: 0.91, y: 0.46 }, // 7号 - 与3号对齐
  { x: 0.91, y: 0.28 }, // 8号 - 与4号对齐
  { x: 0.91, y: 0.10 }, // 9号 - 与5号对齐
];

// Players (kept as AGENTS to minimize code changes across existing components)
export const DEFAULT_AGENTS = [
  {
    id: "player_1",
    name: "1号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_2",
    name: "2号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_3",
    name: "3号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_4",
    name: "4号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_5",
    name: "5号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_6",
    name: "6号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_7",
    name: "7号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_8",
    name: "8号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
  {
    id: "player_9",
    name: "9号",
    role: "未知",
    alignment: "unknown",
    avatar: ASSETS.avatars.villager,
    colors: { bg: "#F8FAFC", text: "#111827", accent: "#111827" }
  },
];

// Back-compat export (legacy imports). Live UI should pass agents via props.
export const AGENTS = DEFAULT_AGENTS;

// Message type colors (very subtle backgrounds)
export const MESSAGE_COLORS = {
  system: { bg: "#FAFAFA", text: "#424242", accent: "#424242" },
  memory: { bg: "#F2FDFF", text: "#00838F", accent: "#00838F" },
  conference: { bg: "#F1F4FF", text: "#3949AB", accent: "#3949AB" }
};

// Helper function to get agent colors by ID or name
export const getAgentColors = (agentId, agentName) => {
  const agent = AGENTS.find(a => a.id === agentId || a.name === agentName);
  return agent?.colors || MESSAGE_COLORS.system;
};

// UI timing constants
export const BUBBLE_LIFETIME_MS = 6000;
export const TYPING_LIFETIME_MS = 30000;
export const CHART_MARGIN = { left: 60, right: 20, top: 20, bottom: 40 };
export const AXIS_TICKS = 5;

// WebSocket configuration
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/game";

