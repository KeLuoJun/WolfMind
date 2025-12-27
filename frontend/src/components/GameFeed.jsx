import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

const formatTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#111827" }}>
          游戏记录
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
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
          <div style={{ color: "#6b7280", padding: "8px 4px" }}>等待事件…</div>
        ) : (
          messages.map((m) => {
            const isHighlighted = highlightId === m.id;
            const isSystem = m.agent === "System" || m.role === "System";

            return (
              <div
                key={m.id}
                id={`feed-item-${m.id}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderLeft: isSystem ? "4px solid #111827" : "4px solid #615CED",
                  background: isHighlighted ? "#fff7ed" : "#ffffff",
                  padding: "10px 10px",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#111827" }}>
                    {isSystem ? "系统" : (m.agent || "玩家")}
                    {!isSystem && m.role ? <span style={{ color: "#6b7280", fontWeight: 700 }}> · {m.role}</span> : null}
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{formatTime(m.timestamp)}</div>
                </div>
                <div style={{ fontSize: 11, color: "#111827", whiteSpace: "pre-wrap" }}>
                  {String(m.content || "")}
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
