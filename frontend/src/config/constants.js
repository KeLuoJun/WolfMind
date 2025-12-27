/**
 * WolfMind Frontend Constants (Werewolf)
 * The UI is a single-page "werewolf room" + event feed.
 */

export const ASSETS = {
  logo: "/wolfmind_logo.svg",
  roomBg: "/room_bg.svg",
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

// Seat positions (percentage relative to image, origin at bottom-left)
// Format: { x: horizontal %, y: vertical % from bottom }
export const AGENT_SEATS = [
  // top edge
  { x: 0.44, y: 0.58 },
  { x: 0.55, y: 0.58 },
  // upper left / upper right
  { x: 0.33, y: 0.52 },
  { x: 0.67, y: 0.52 },
  // mid left / mid right
  { x: 0.40, y: 0.44 },
  { x: 0.60, y: 0.44 },
  // lower left / lower / lower right
  { x: 0.44, y: 0.36 },
  { x: 0.50, y: 0.34 },
  { x: 0.56, y: 0.36 },
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
export const BUBBLE_LIFETIME_MS = 3000;
export const CHART_MARGIN = { left: 60, right: 20, top: 20, bottom: 40 };
export const AXIS_TICKS = 5;

// WebSocket configuration
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/game";

