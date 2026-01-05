import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { SCENE_NATIVE, AGENT_SEATS, API_URL } from '../config/constants';
import AgentCard from './AgentCard';
import { getModelIcon } from '../utils/modelIcons';

const INSIGHTS_CACHE_TTL_MS = 10_000;

/**
 * Get rank medal/trophy for display
 */
function getRankMedal(rank) {
  if (rank === 1) return '🏆';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

/**
 * Room View Component
 * Displays the conference room with agents, speech bubbles, and agent cards
 * Supports click and hover (1.5s) to show agent performance cards
 * Supports replay mode - completely independent from live mode
 */
export default function RoomView({ agents = [], bubbles, bubbleFor, leaderboard, feed, onJumpToMessage, phaseText }) {  const containerRef = useRef(null);

  const sceneMode = useMemo(() => {
    const t = String(phaseText || '').toLowerCase();
    if (t.includes('夜')) return 'night';
    if (t.includes('白')) return 'day';
    return 'night';
  }, [phaseText]);

  const seatIndexForAgent = useCallback((agent, fallbackIdx) => {
    const id = String(agent?.id || '');
    const name = String(agent?.name || '');
    let n = NaN;
    if (id.startsWith('player_')) {
      n = Number(id.slice(7));
    }
    if (!Number.isFinite(n)) {
      const m = name.match(/(\d+)/);
      if (m) n = Number(m[1]);
    }
    if (Number.isFinite(n) && n >= 1 && n <= 9) return n - 1;
    return fallbackIdx ?? 0;
  }, []);

  // Agent selection and hover state
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [hoveredTopAgentId, setHoveredTopAgentId] = useState(null);
  const [playersInsights, setPlayersInsights] = useState(null);
  const [playersInsightsError, setPlayersInsightsError] = useState(null);
  const insightsCacheRef = useRef({ at: 0, data: null });
  const [isClosing, setIsClosing] = useState(false);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const fetchPlayersInsights = useCallback(async () => {
    const now = Date.now();
    if (
      insightsCacheRef.current.data &&
      now - insightsCacheRef.current.at < INSIGHTS_CACHE_TTL_MS
    ) {
      return insightsCacheRef.current.data;
    }

    try {
      setPlayersInsightsError(null);
      const res = await fetch(`${API_URL}/api/players/insights`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      insightsCacheRef.current = { at: now, data };
      setPlayersInsights(data);
      return data;
    } catch (e) {
      const msg = e?.message || 'Failed to load insights';
      setPlayersInsightsError(msg);
      setPlayersInsights(null);
      return null;
    }
  }, []);

  // Bubble expansion state
  const [expandedBubbles, setExpandedBubbles] = useState({});

  // Hidden bubbles (locally dismissed)
  const [hiddenBubbles, setHiddenBubbles] = useState({});

  // Handle bubble close
  const handleCloseBubble = (agentId, bubbleKey, e) => {
    e.stopPropagation();
    setHiddenBubbles(prev => ({
      ...prev,
      [bubbleKey]: true
    }));
  };

  // Replay state (must be defined before using in useMemo)
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayBubbles, setReplayBubbles] = useState({});
  const [modeTransition, setModeTransition] = useState(null); // 'entering-replay' | 'exiting-replay' | null
  const [isPaused, setIsPaused] = useState(false);
  const replayTimerRef = useRef(null);
  const replayTimeoutsRef = useRef([]);
  const replayStateRef = useRef({ messages: [], currentIndex: 0 });

  // Background is drawn procedurally on canvas (no static background images).

  // Calculate scale to fit canvas in container (maximize visible scene)
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const { clientWidth, clientHeight } = container;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      const scaleX = clientWidth / SCENE_NATIVE.width;
      const scaleY = clientHeight / SCENE_NATIVE.height;

      // Use more of the available space and allow more upscaling to reduce emptiness.
      const maxScale = 1.55;
      const fitScale = Math.min(scaleX, scaleY);
      const newScale = Math.min(fitScale * 1.06, maxScale);
      setScale(Math.max(0.45, newScale));
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  // Determine which agents are speaking
  const speakingAgents = useMemo(() => {
    const speaking = {};
    agents.forEach(agent => {
      const bubble = bubbleFor(agent.name);
      speaking[agent.id] = !!bubble;
    });
    return speaking;
  }, [agents, bubbleFor]);

  // Find agent data from leaderboard
  const getAgentData = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    // If no leaderboard data, return agent with default stats
    if (!leaderboard || !Array.isArray(leaderboard)) {
      return {
        ...agent,
        bull: { n: 0, win: 0, unknown: 0 },
        bear: { n: 0, win: 0, unknown: 0 },
        winRate: null,
        signals: [],
        rank: null
      };
    }

    const leaderboardData = leaderboard.find(lb => lb.agentId === agentId);

    // If agent not in leaderboard, return agent with default stats
    if (!leaderboardData) {
      return {
        ...agent,
        bull: { n: 0, win: 0, unknown: 0 },
        bear: { n: 0, win: 0, unknown: 0 },
        winRate: null,
        signals: [],
        rank: null
      };
    }

    // Merge data but preserve the correct avatar from UI agents config
    return {
      ...agent,
      ...leaderboardData,
      avatar: agent.avatar  // Always use the frontend's avatar URL
    };
  };

  // Get agent rank for display
  const getAgentRank = (agentId) => {
    const agentData = getAgentData(agentId);
    return agentData?.rank || null;
  };

  // Handle agent click
  const handleAgentClick = (agentId) => {
    // Cancel any closing animation
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);

    const agentData = getAgentData(agentId);
    if (agentData) {
      setSelectedAgent(agentData);
    }
  };

  // Handle agent hover
  const handleAgentMouseEnter = (agentId) => {
    setHoveredAgent(agentId);
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Cancel any closing animation
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);

    // NOTE: AgentCard is click-only; hover only highlights.
  };

  const handleAgentMouseLeave = () => {
    setHoveredAgent(null);
    // Clear timer if mouse leaves before 1.5 seconds
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleTopAgentMouseEnter = useCallback(async (agentId) => {
    setHoveredAgent(agentId);
    setHoveredTopAgentId(agentId);
    await fetchPlayersInsights();
  }, [fetchPlayersInsights]);

  const handleTopAgentMouseLeave = useCallback(() => {
    setHoveredAgent(null);
    setHoveredTopAgentId(null);
  }, []);

  // Handle closing with animation
  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before removing
    closeTimerRef.current = setTimeout(() => {
      setSelectedAgent(null);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 200); // Match the slideUp animation duration
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      // Clean up replay timers
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      replayTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      replayTimeoutsRef.current = [];
    };
  }, []);

  // Show replay button when not in replay mode and has feed history
  const showReplayButton = !isReplaying && feed && feed.length > 0;

  // Start replay with feed data
  const handleReplayClick = useCallback(() => {
    if (!feed || feed.length === 0) {
      return;
    }
    startReplay(feed);
  }, [feed]);

  // Extract agent messages from feed items
  const extractAgentMessages = useCallback((feedItems) => {
    const messages = [];

    feedItems.forEach((item, itemIndex) => {
      if (item.type === 'message' && item.data) {
        const msg = item.data;
        // Skip system messages
        if (msg.agent === 'System') return;
        // Find matching agent
        const agent = agents.find(a =>
          a.id === msg.agentId ||
          a.name === msg.agent
        );
        if (agent) {
          messages.push({
            feedItemId: item.id,
            agentId: agent.id,
            agentName: agent.name,
            content: msg.content,
            timestamp: msg.timestamp
          });
        }
      } else if (item.type === 'conference' && item.data?.messages) {
        item.data.messages.forEach((msg, msgIndex) => {
          if (msg.agent === 'System') return;
          const agent = agents.find(a =>
            a.id === msg.agentId ||
            a.name === msg.agent
          );
          if (agent) {
            messages.push({
              feedItemId: item.id,
              agentId: agent.id,
              agentName: agent.name,
              content: msg.content,
              timestamp: msg.timestamp
            });
          }
        });
      }
    });

    return messages;
  }, [agents]);

  // Show next message in replay
  const showNextMessage = useCallback(() => {
    const { messages, currentIndex } = replayStateRef.current;
    if (currentIndex >= messages.length) {
      // End replay
      setModeTransition('exiting-replay');
      setTimeout(() => {
        setModeTransition(null);
        setIsReplaying(false);
        setIsPaused(false);
        setReplayBubbles({});
        replayStateRef.current = { messages: [], currentIndex: 0 };
      }, 500);
      return;
    }

    const msg = messages[currentIndex];
    const bubbleId = `replay_${msg.agentId}_${currentIndex}`;

    setReplayBubbles(prev => ({
      ...prev,
      [bubbleId]: {
        id: bubbleId,
        feedItemId: msg.feedItemId,
        agentId: msg.agentId,
        agentName: msg.agentName,
        text: msg.content,
        timestamp: msg.timestamp,
        ts: msg.timestamp
      }
    }));

    // Remove bubble after 10 seconds (previously 5s) to keep replay text visible longer
    const hideTimeout = setTimeout(() => {
      setReplayBubbles(prev => {
        const newBubbles = { ...prev };
        delete newBubbles[bubbleId];
        return newBubbles;
      });
    }, 10000);
    replayTimeoutsRef.current.push(hideTimeout);

    // Schedule next message
    replayStateRef.current.currentIndex = currentIndex + 1;
    // Wait longer before next bubble to match extended visibility (was 3s)
    const nextTimeout = setTimeout(() => {
      showNextMessage();
    }, 6000);
    replayTimerRef.current = nextTimeout;
    replayTimeoutsRef.current.push(nextTimeout);
  }, []);

  // Start replay with feed data
  const startReplay = useCallback((feedItems) => {
    if (!feedItems || feedItems.length === 0) {
      return;
    }

    const agentMessages = extractAgentMessages(feedItems).reverse();
    if (agentMessages.length === 0) {
      return;
    }

    // Store messages for pause/resume
    replayStateRef.current = { messages: agentMessages, currentIndex: 0 };

    // Start transition animation
    setModeTransition('entering-replay');
    setIsReplaying(true);
    setIsPaused(false);
    setReplayBubbles({});

    // Clear any existing timeouts
    replayTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    replayTimeoutsRef.current = [];

    // Clear transition and start replay after animation completes
    setTimeout(() => {
      setModeTransition(null);
      showNextMessage();
    }, 500);
  }, [extractAgentMessages, showNextMessage]);

  // Pause replay
  const pauseReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsPaused(true);
  }, []);

  // Resume replay
  const resumeReplay = useCallback(() => {
    setIsPaused(false);
    showNextMessage();
  }, [showNextMessage]);

  // Stop replay
  const stopReplay = useCallback(() => {
    // Clear all timeouts
    replayTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    replayTimeoutsRef.current = [];

    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    // Transition out of replay mode
    setModeTransition('exiting-replay');
    // Clear transition and replay state after animation completes
    setTimeout(() => {
      setModeTransition(null);
      setIsReplaying(false);
      setIsPaused(false);
      setReplayBubbles({});
      replayStateRef.current = { messages: [], currentIndex: 0 };
    }, 500);
  }, []);

  // Get bubble for specific agent (supports both live and replay mode)
  const getBubbleForAgent = useCallback((agentId) => {
    if (!agentId) return null;
    if (isReplaying) {
      return Object.values(replayBubbles).find(b => b && b.agentId === agentId) || null;
    }
    return bubbleFor(agentId);
  }, [isReplaying, replayBubbles, bubbleFor]);

  return (
    <div className="room-view">
      {/* Agents Indicator Bar */}
      <div className="room-agents-indicator">
        {agents.map((agent, index) => {
          const rank = getAgentRank(agent.id);
          const medal = rank ? getRankMedal(rank) : null;
          const agentData = getAgentData(agent.id);
          const modelInfo = getModelIcon(agentData?.modelName, agentData?.modelProvider);

          return (
            <React.Fragment key={agent.id}>
              <div
                className={`agent-indicator ${speakingAgents[agent.id] ? 'speaking' : ''} ${hoveredAgent === agent.id ? 'hovered' : ''}`}
                onClick={() => handleAgentClick(agent.id)}
                onMouseEnter={() => handleTopAgentMouseEnter(agent.id)}
                onMouseLeave={handleTopAgentMouseLeave}
              >
                <div className="agent-avatar-wrapper">
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="agent-avatar"
                  />
                  <span className="agent-indicator-dot"></span>
                  {medal && (
                    <span className="agent-rank-medal">
                      {medal}
                    </span>
                  )}
                  {modelInfo.logoPath && (
                    <img
                      src={modelInfo.logoPath}
                      alt={modelInfo.provider}
                      className="agent-model-badge"
                      style={{
                        position: 'absolute',
                        top: -12,
                        right: -12,
                        width: 25,
                        height: 25,
                        borderRadius: '50%',
                        border: '2px solid #ffffff',
                        background: '#ffffff',
                        objectFit: 'contain',
                        padding: 2,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </div>
                <span className="agent-name">{agent.name}</span>
              </div>
            </React.Fragment>
          );
        })}

        {/* Hint Text */}
        <div className="agent-hint-text">
          点击头像查看身份信息
        </div>

        {hoveredTopAgentId && (
          <div className="room-insights-popover" role="dialog" aria-label="Player insights">
            <div className="room-insights-title">
              {agents.find(a => a.id === hoveredTopAgentId)?.name || hoveredTopAgentId}
            </div>

            {playersInsightsError ? (
              <div className="room-insights-empty">{playersInsightsError}</div>
            ) : !playersInsights ? (
              <div className="room-insights-empty">Loading…</div>
            ) : (
              (() => {
                const p = playersInsights.players?.[hoveredTopAgentId];
                const impressions = p?.impressions || {};
                const knowledge = String(p?.knowledge || '').trim();
                const impressionEntries = Object.entries(impressions).filter(([, v]) => String(v || '').trim().length > 0);

                return (
                  <>
                    <div className="room-insights-section">
                      <div className="room-insights-section-title">对其他玩家的印象</div>
                      {impressionEntries.length === 0 ? (
                        <div className="room-insights-empty">暂无印象。</div>
                      ) : (
                        <div className="room-insights-list">
                          {impressionEntries.map(([other, text]) => (
                            <div className="room-insights-row" key={other}>
                              <div className="room-insights-key">{other}</div>
                              <div className="room-insights-val">{text}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="room-insights-section">
                      <div className="room-insights-section-title">学习到的经验</div>
                      {knowledge ? (
                        <div className="room-insights-text">{knowledge}</div>
                      ) : (
                        <div className="room-insights-empty">暂无学习到的经验。</div>
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Room Canvas */}
      <div className="room-canvas-container" ref={containerRef}>
          <div className="room-scene">
          <div
            className={`room-scene-wrapper ${sceneMode === 'day' ? 'is-day' : 'is-night'}`}
            style={{ position: 'relative', width: Math.round(SCENE_NATIVE.width * scale), height: Math.round(SCENE_NATIVE.height * scale) }}
          >
            {/* 动态背景层 */}
            <div className="room-background-layer">
              {/* 天空渐变 */}
              <div className="sky-gradient" />
              
              {/* 星星层 (夜晚) */}
              <div className="stars-layer">
                {[...Array(80)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`star star-${i % 3}`}
                    style={{
                      left: `${(i * 13.7 + i * i * 0.3) % 100}%`,
                      top: `${(i * 7.3 + i * 0.5) % 60}%`,
                      animationDelay: `${(i * 0.1) % 3}s`,
                    }}
                  />
                ))}
              </div>
              
              {/* 流星 (夜晚) */}
              <div className="shooting-stars">
                <div className="shooting-star shooting-star-1" />
                <div className="shooting-star shooting-star-2" />
                <div className="shooting-star shooting-star-3" />
              </div>
              
              {/* 云朵层 (白天) */}
              <div className="clouds-layer">
                <div className="cloud cloud-1" />
                <div className="cloud cloud-2" />
                <div className="cloud cloud-3" />
                <div className="cloud cloud-4" />
              </div>
              
              {/* 飞鸟 (白天) */}
              <div className="birds-layer">
                <div className="bird bird-1">
                  <div className="bird-body" />
                </div>
                <div className="bird bird-2">
                  <div className="bird-body" />
                </div>
                <div className="bird bird-3">
                  <div className="bird-body" />
                </div>
              </div>
              
              {/* 地面 */}
              <div className="ground-layer" />
              
              {/* 地平线光晕 */}
              <div className="horizon-glow" />
              
              {/* 萤火虫 (夜晚) */}
              <div className="fireflies-layer">
                {[...Array(15)].map((_, i) => (
                  <div 
                    key={i} 
                    className="firefly"
                    style={{
                      left: `${10 + (i * 17) % 80}%`,
                      top: `${50 + (i * 11) % 45}%`,
                      animationDelay: `${(i * 0.4) % 4}s`,
                      animationDuration: `${3 + (i % 3)}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Celestial overlay (sun/moon), animates on day/night switch */}
            <div className="room-celestial-layer" aria-hidden="true">
              <div className="room-celestial room-celestial-sun">
                <div className="sun-rays" />
              </div>
              <div className="room-celestial room-celestial-moon" />
            </div>

            {/* Agents on seats (around the table) */}
            {agents.map((agent, idx) => {
              const seatIdx = seatIndexForAgent(agent, idx);
              const pos = AGENT_SEATS[seatIdx] || AGENT_SEATS[0];
              const scaledWidth = SCENE_NATIVE.width * scale;
              const scaledHeight = SCENE_NATIVE.height * scale;

              const left = Math.round(pos.x * scaledWidth);
              const top = Math.round(scaledHeight - pos.y * scaledHeight);

              const isSpeaking = !!speakingAgents[agent.id];

              return (
                <div
                  key={agent.id}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 15,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    userSelect: 'none'
                  }}
                  onClick={() => handleAgentClick(agent.id)}
                  onMouseEnter={() => handleAgentMouseEnter(agent.id)}
                  onMouseLeave={handleAgentMouseLeave}
                >
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 999,
                      border: '2px solid #000000',
                      background: 'rgba(255, 255, 255, 0.10)',
                      boxShadow: isSpeaking ? '0 0 0 4px rgba(97, 92, 237, 0.35)' : '0 4px 10px rgba(0, 0, 0, 0.10)'
                    }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'IBM Plex Mono, monospace',
                      background: '#ffffff',
                      border: '2px solid #000000',
                      padding: '2px 7px',
                      borderRadius: 4,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      boxShadow: '2px 2px 0 0 rgba(0,0,0,0.1)'
                    }}
                  >
                    {agent.name}
                  </div>
                </div>
              );
            })}

            {/* Speech Bubbles */}
            {agents.map((agent, idx) => {
              const bubble = getBubbleForAgent(agent.id);
              if (!bubble) return null;

              const bubbleKey = `${agent.id}_${bubble.timestamp || bubble.id || bubble.ts}`;

              // Check if bubble is hidden
              if (hiddenBubbles[bubbleKey]) return null;

              const seatIdx = seatIndexForAgent(agent, idx);
              const pos = AGENT_SEATS[seatIdx] || AGENT_SEATS[0];
              const scaledWidth = SCENE_NATIVE.width * scale;
              const scaledHeight = SCENE_NATIVE.height * scale;

              // Position wrapper centered on the agent seat
              const left = Math.round(pos.x * scaledWidth);
              const top = Math.round(scaledHeight - pos.y * scaledHeight);

              const isLeftSide = pos.x < 0.5;

              // Get agent data for model info
              const agentData = getAgentData(agent.id);
              const modelInfo = getModelIcon(agentData?.modelName, agentData?.modelProvider);

              const displayText = bubble.text;

              const handleJumpToFeed = (e) => {
                e.stopPropagation();
                if (onJumpToMessage) {
                  onJumpToMessage(bubble);
                }
              };

              return (
                <div
                  key={agent.id}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25,
                  }}
                >
                  <div
                    className={`room-bubble ${isLeftSide ? 'room-bubble--left' : 'room-bubble--right'}`}
                    style={{
                      position: 'absolute',
                      // 气泡底部对齐玩家头像中心，这样气泡向上延伸
                      bottom: 0,
                      // 气泡水平位置：左侧玩家气泡在右边，右侧玩家气泡在左边
                      left: isLeftSide ? 50 : 'auto',
                      right: isLeftSide ? 'auto' : 50,
                    }}
                  >
                  {/* 玩家名称标签 - 在气泡左上角或右上角 */}
                  <div
                    className="bubble-player-tag"
                    style={{
                      position: 'absolute',
                      top: '-22px',
                      [isLeftSide ? 'left' : 'right']: '0',
                      background: '#615CED',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '6px 6px 0 0',
                      fontFamily: 'IBM Plex Mono, monospace',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 -2px 4px rgba(97, 92, 237, 0.2)',
                    }}
                  >
                    {agent.name} 
                  </div>

                  {/* 连接线：从气泡指向玩家头像 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      [isLeftSide ? 'left' : 'right']: '-25px',
                      width: '25px',
                      height: '3px',
                      background: '#615CED',
                      borderRadius: '2px',
                    }}
                  />
                  {/* 连接点 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      [isLeftSide ? 'left' : 'right']: '-32px',
                      width: '10px',
                      height: '10px',
                      background: '#615CED',
                      borderRadius: '50%',
                      boxShadow: '0 0 0 3px rgba(97, 92, 237, 0.3)',
                    }}
                  />

                  {/* Action buttons */}
                  <div className="bubble-action-buttons">
                    <button
                      className="bubble-jump-btn"
                      onClick={handleJumpToFeed}
                      title="Jump to message in feed"
                    >
                      ↗
                    </button>
                    <button
                      className="bubble-close-btn"
                      onClick={(e) => handleCloseBubble(agent.id, bubbleKey, e)}
                      title="Close bubble"
                    >
                      ×
                    </button>
                  </div>

                  {/* Agent header with model icon */}
                  <div className="room-bubble-header">
                    {modelInfo.logoPath && (
                      <img
                        src={modelInfo.logoPath}
                        alt={modelInfo.provider}
                        className="bubble-model-icon"
                      />
                    )}
                    <div className="room-bubble-name">{bubble.agentName || agent.name}</div>
                  </div>

                  <div className="room-bubble-divider"></div>

                  {/* Message content */}
                  <div className="room-bubble-content">
                    {displayText}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Card - Dropdown style below indicator bar */}
        {selectedAgent && (
          <>
            {/* Transparent overlay to close card */}
            <div
              className="agent-card-overlay"
              onClick={handleClose}
            />

            {/* Agent Card */}
            <AgentCard
              agent={selectedAgent}
              isClosing={isClosing}
              onClose={handleClose}
            />
          </>
        )}

        {/* Mode Transition Overlay - sweeps in the dark gradient */}
        {modeTransition === 'entering-replay' && (
          <div
            style={{
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
            }}
          />
        )}

        {/* Mode Transition Overlay - sweeps out the dark gradient */}
        {modeTransition === 'exiting-replay' && (
          <div
            style={{
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
            }}
          />
        )}

        {/* Replay Button */}
        {showReplayButton && (
          <div className="replay-button-container">
            <button
              className="replay-button"
              onClick={handleReplayClick}
              title="Replay feed history"
            >
              <span className="replay-icon">&#9654;&#9654;</span>
              <span>REPLAY</span>
            </button>
          </div>
        )}

        {/* Replay Mode Background + Indicator */}
        {isReplaying && !modeTransition && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
                pointerEvents: 'none',
                zIndex: 40
              }}
            />
            <div className="replay-indicator">
              <span className="replay-status">{isPaused ? 'PAUSED' : 'REPLAY MODE'}</span>
              <button
                className="replay-button"
                onClick={isPaused ? resumeReplay : pauseReplay}
                style={{ padding: '6px 12px' }}
              >
                <span>{isPaused ? '▶' : '⏸'}</span>
              </button>
              <button className="replay-button" onClick={stopReplay} style={{ padding: '6px 12px' }}>
                <span>■</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

