import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

const formatTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// 消息类型颜色配置（柔和的颜色）
const MESSAGE_STYLES = {
  // 系统消息（如连接状态、游戏开始/结束）- 灰色调
  system: {
    borderColor: "#6b7280",
    bgColor: "#f9fafb",
    labelColor: "#4b5563",
    textColor: "#374151",
  },
  // 游戏阶段消息（如"第1回合"、"夜晚阶段开始"）- 蓝灰色调
  gamePhase: {
    borderColor: "#64748b",
    bgColor: "#f8fafc",
    labelColor: "#475569",
    textColor: "#334155",
  },
  // 玩家发言 - 紫色调
  player: {
    borderColor: "#7c73e6",
    bgColor: "#fafaff",
    labelColor: "#5b52cc",
    textColor: "#1f2937",
  },
};

// 判断是否为游戏阶段消息
const isGamePhaseMessage = (content) => {
  if (!content) return false;
  const text = String(content);
  const phasePatterns = [
    /第\s*\d+\s*回合/,
    /夜晚阶段/,
    /白天阶段/,
    /游戏开始/,
    /游戏结束/,
    /投票阶段/,
    /讨论阶段/,
    /天亮了/,
    /请.*睁眼/,
    /请.*闭眼/,
    /被淘汰/,
    /出局/,
    /平安夜/,
    /狼人.*请/,
    /预言家.*请/,
    /女巫.*请/,
    /猎人.*请/,
    /守卫.*请/,
  ];
  return phasePatterns.some(pattern => pattern.test(text));
};

// 获取消息样式
const getMessageStyle = (m) => {
  const isSystem = m.agent === "System" || m.role === "System";
  
  if (isSystem) {
    // 检查是否为游戏阶段消息
    if (isGamePhaseMessage(m.content)) {
      return MESSAGE_STYLES.gamePhase;
    }
    return MESSAGE_STYLES.system;
  }
  
  return MESSAGE_STYLES.player;
};

const normalizeFeedToMessages = (feed) => {
  const out = [];
  for (const item of feed || []) {
    if (!item) continue;

    if (item.type === "conference" && item.data?.messages) {
      for (const msg of item.data.messages) {
        out.push({
          id: msg.id,
          timestamp: msg.timestamp,
          agent: msg.agent,
          role: msg.role,
          content: msg.content,
          agentId: msg.agentId,
          thought: msg.thought,
          behavior: msg.behavior,
          speech: msg.speech,
          category: msg.category,
          action: msg.action,
        });
      }
      continue;
    }

    if (item.type === "message" && item.data) {
      out.push({
        id: item.id,
        timestamp: item.data.timestamp,
        agent: item.data.agent,
        role: item.data.role,
        content: item.data.content,
        agentId: item.data.agentId,
        thought: item.data.thought,
        behavior: item.data.behavior,
        speech: item.data.speech,
        category: item.data.category,
        action: item.data.action,
      });
      continue;
    }

    if (item.type === "memory" && item.data) {
      out.push({
        id: item.id,
        timestamp: item.data.timestamp,
        agent: item.data.agent,
        role: "记忆",
        content: item.data.content,
        agentId: item.data.agentId,
      });
    }
  }

  // feed is newest-first; keep it newest-first
  return out;
};

const renderMessageBody = (m, textColor) => {
  const thought = String(m.thought || "").trim();
  const behavior = String(m.behavior || "").trim();
  const speech = String(m.speech || "").trim();
  const content = String(m.content || "").trim();

  const hasStructured = Boolean(thought || behavior || speech);
  if (!hasStructured) {
    return (
      <div
        style={{
          fontSize: 13,
          color: textColor,
          whiteSpace: "pre-wrap",
          lineHeight: 1.7,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {thought ? (
        <div style={{ fontSize: 13, color: "#6b7280", whiteSpace: "pre-wrap", lineHeight: 1.7, overflowWrap: "anywhere" }}>
          <span style={{ fontWeight: 700, color: "#9ca3af" }}>心声：</span>{thought}
        </div>
      ) : null}
      {behavior ? (
        <div style={{ fontSize: 13, color: textColor, whiteSpace: "pre-wrap", lineHeight: 1.7, overflowWrap: "anywhere" }}>
          <span style={{ fontWeight: 700, color: "#7c73e6" }}>表现：</span>{behavior}
        </div>
      ) : null}
      {speech ? (
        <div style={{ fontSize: 13, color: textColor, whiteSpace: "pre-wrap", lineHeight: 1.7, overflowWrap: "anywhere" }}>
          <span style={{ fontWeight: 700, color: "#5b52cc" }}>发言：</span>{speech}
        </div>
      ) : null}
      {!speech && content ? (
        <div style={{ fontSize: 13, color: textColor, whiteSpace: "pre-wrap", lineHeight: 1.7, overflowWrap: "anywhere" }}>{content}</div>
      ) : null}
    </div>
  );
};

const GameFeed = forwardRef(function GameFeed({ feed }, ref) {
  const containerRef = useRef(null);
  const [highlightId, setHighlightId] = useState(null);

  const messages = useMemo(() => normalizeFeedToMessages(feed), [feed]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToMessage: (bubble) => {
        const id = bubble?.feedItemId || bubble?.id;
        if (!id) return;
        const el = document.getElementById(`feed-item-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightId(id);
          setTimeout(() => setHighlightId(null), 1600);
        }
      },
    }),
    []
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        flexShrink: 0,
        padding: "14px 16px",
        background: "#ffffff",
        borderBottom: "1px solid #e0e0e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#111827" }}>
          游戏记录
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {messages.length} 条
        </div>
      </div>

      <div
        ref={containerRef}
        className="feed-content"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "12px",
          background: "#f5f5f5",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#6b7280", padding: "8px 4px", fontSize: 13 }}>等待事件…</div>
        ) : (
          messages.map((m) => {
            const isHighlighted = highlightId === m.id;
            const isSystem = m.agent === "System" || m.role === "System";
            const style = getMessageStyle(m);

            return (
              <div
                key={m.id}
                id={`feed-item-${m.id}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderLeft: `4px solid ${style.borderColor}`,
                  background: isHighlighted ? "#fff7ed" : style.bgColor,
                  padding: "12px 12px",
                  marginBottom: 10,
                  borderRadius: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: style.labelColor }}>
                    {isSystem ? "系统" : (m.agent || "玩家")}
                    {!isSystem && m.role ? <span style={{ color: "#9ca3af", fontWeight: 600 }}> · {m.role}</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{formatTime(m.timestamp)}</div>
                </div>
                <div>
                  {renderMessageBody(m, style.textColor)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default GameFeed;
