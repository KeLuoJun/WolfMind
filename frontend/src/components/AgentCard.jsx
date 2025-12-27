import React from "react";

/**
 * Player Card (Werewolf)
 * Kept as `AgentCard` filename to minimize changes in existing `RoomView`.
 */
export default function AgentCard({ agent, isClosing }) {
  if (!agent) return null;

  const displayName = agent.name || agent.id;
  const role = agent.role || "未知身份";
  const alignment = agent.alignment || "unknown";
  const alignmentLabel = alignment === "werewolves" ? "狼人阵营" : alignment === "villagers" ? "好人阵营" : "未知阵营";
  const alive = agent.alive !== false;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        background: "#ffffff",
        borderBottom: "2px solid #000000",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        zIndex: 1000,
        animation: isClosing ? "slideUp 0.2s ease-out forwards" : "slideDown 0.25s ease-out",
      }}
    >
      <div style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
        {agent.avatar ? (
          <img src={agent.avatar} alt={displayName} style={{ width: 52, height: 52, objectFit: "contain" }} />
        ) : null}
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#000000" }}>{displayName}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>身份：{role}</div>
          <div style={{ fontSize: 12, color: "#374151" }}>{alignmentLabel}</div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            padding: "6px 10px",
            border: "2px solid #000000",
            background: "#fafafa",
            fontSize: 12,
            fontWeight: 800,
            color: alive ? "#16a34a" : "#ef4444",
          }}
        >
          {alive ? "存活" : "出局"}
        </div>
      </div>

      <style>
        {`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
          }
        `}
      </style>
    </div>
  );
}

