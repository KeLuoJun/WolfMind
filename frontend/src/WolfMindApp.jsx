import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import GlobalStyles from "./styles/GlobalStyles";
import Header from "./components/Header";
import RoomView from "./components/RoomView";
import GameFeed from "./components/GameFeed";

import { AGENTS } from "./config/constants";
import { ReadOnlyClient } from "./services/websocket";
import { useFeedProcessor } from "./hooks/useFeedProcessor";

const extractBubbleText = (content) => {
  const text = String(content || "");
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

export default function WolfMindApp() {
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting|connected|disconnected
  const [phaseText, setPhaseText] = useState("准备中");

  const { feed, processHistoricalFeed, processFeedEvent, addSystemMessage } = useFeedProcessor();

  const [bubbles, setBubbles] = useState({});
  const clientRef = useRef(null);
  const feedRef = useRef(null);

  const statusText = useMemo(() => {
    if (connectionStatus === "connected") return "已连接";
    if (connectionStatus === "disconnected") return "连接断开";
    return "连接中";
  }, [connectionStatus]);

  const bubbleFor = useCallback(
    (idOrName) => {
      if (!idOrName) return null;
      const direct = bubbles[idOrName];
      if (direct) return direct;

      const agent = AGENTS.find((a) => a.id === idOrName || a.name === idOrName);
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

    const msg = messageOrFeedItem.type ? messageOrFeedItem.data : messageOrFeedItem;
    if (!msg || !msg.agentId) return;

    const agent = AGENTS.find((a) => a.id === msg.agentId);
    const bubble = {
      agentId: msg.agentId,
      agentName: msg.agent || agent?.name,
      text: extractBubbleText(msg.content),
      timestamp: msg.timestamp || Date.now(),
      ts: msg.timestamp || Date.now(),
      id: msg.id,
      feedItemId: msg.id,
    };

    setBubbles((prev) => ({
      ...prev,
      [msg.agentId]: bubble,
    }));
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

      if (evt.type === "day_start") {
        setPhaseText("白天");
      }
      if (evt.type === "night_start") {
        setPhaseText("夜晚");
      }

      if (evt.type === "historical" && Array.isArray(evt.events)) {
        processHistoricalFeed(evt.events);
        return;
      }

      const processed = processFeedEvent(evt);
      // processed could be: conference object, message object, or feedItem
      if (evt.type === "agent_message" || evt.type === "conference_message") {
        upsertBubbleFromMessage(processed);
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
  }, [addSystemMessage, processFeedEvent, processHistoricalFeed, upsertBubbleFromMessage]);

  return (
    <div className="app">
      <GlobalStyles />

      <div className="header">
        <Header statusText={statusText} phaseText={phaseText} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ width: "70%", minWidth: 0, borderRight: "1px solid #e0e0e0" }}>
          <RoomView
            bubbles={bubbles}
            bubbleFor={bubbleFor}
            leaderboard={[]}
            feed={feed}
            onJumpToMessage={handleJumpToMessage}
          />
        </div>
        <div style={{ width: "30%", minWidth: 320 }}>
          <GameFeed ref={feedRef} feed={feed} />
        </div>
      </div>
    </div>
  );
}
