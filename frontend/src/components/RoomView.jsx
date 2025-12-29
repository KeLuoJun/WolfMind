import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { SCENE_NATIVE, AGENT_SEATS } from '../config/constants';
import AgentCard from './AgentCard';
import { getModelIcon } from '../utils/modelIcons';

/**
 * Custom hook to load an image
 */
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRoomBackground(ctx, mode) {
  const w = SCENE_NATIVE.width;
  const h = SCENE_NATIVE.height;

  ctx.clearRect(0, 0, w, h);

  // Base sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (mode === 'day') {
    sky.addColorStop(0, '#F0F4FF');
    sky.addColorStop(0.4, '#FFFFFF');
    sky.addColorStop(1, '#E2E8F0');
  } else {
    sky.addColorStop(0, '#020617');
    sky.addColorStop(0.5, '#0F172A');
    sky.addColorStop(1, '#020617');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars for night mode
  if (mode === 'night') {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 220; i++) {
      const x = (i * 1337) % w;
      const y = (i * 7331) % Math.round(h * 0.62);
      const big = i % 17 === 0;
      const size = big ? 1.8 : (i % 3 === 0 ? 1.1 : 0.7);
      ctx.globalAlpha = big ? 0.55 : (0.14 + (Math.sin(i) + 1) * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      if (big) {
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(x, y, size * 5.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Aurora / soft indigo glow
  if (mode === 'night') {
    ctx.save();
    const aurora = ctx.createLinearGradient(0, 0, w, 0);
    aurora.addColorStop(0.05, 'rgba(97, 92, 237, 0.00)');
    aurora.addColorStop(0.28, 'rgba(97, 92, 237, 0.10)');
    aurora.addColorStop(0.55, 'rgba(97, 92, 237, 0.04)');
    aurora.addColorStop(0.82, 'rgba(97, 92, 237, 0.08)');
    aurora.addColorStop(0.95, 'rgba(97, 92, 237, 0.00)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, w, Math.round(h * 0.62));
    ctx.restore();
  }

  // Subtle horizon glow / vignette
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, 100, w * 0.5, h * 0.5, w * 0.8);
  if (mode === 'day') {
    vignette.addColorStop(0, 'rgba(97, 92, 237, 0.05)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
  } else {
    vignette.addColorStop(0, 'rgba(97, 92, 237, 0.08)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Decorative grid lines (very subtle)
  ctx.save();
  ctx.globalAlpha = mode === 'day' ? 0.03 : 0.06;
  ctx.strokeStyle = mode === 'day' ? '#64748B' : '#94A3B8';
  ctx.lineWidth = 1;
  const step = 80;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Floor
  const floorTop = Math.round(h * 0.65);
  const floor = ctx.createLinearGradient(0, floorTop, 0, h);
  if (mode === 'day') {
    floor.addColorStop(0, 'rgba(226, 232, 240, 0.4)');
    floor.addColorStop(1, 'rgba(203, 213, 225, 0.6)');
  } else {
    floor.addColorStop(0, 'rgba(15, 23, 42, 0.5)');
    floor.addColorStop(1, 'rgba(2, 6, 23, 0.8)');
  }
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorTop, w, h - floorTop);

  // Central stage panel (Removed border as requested)
  const panelW = Math.round(w * 0.65);
  const panelH = Math.round(h * 0.5);
  const panelX = Math.round((w - panelW) / 2);
  const panelY = Math.round(h * 0.15);

  ctx.save();
  ctx.globalAlpha = mode === 'day' ? 0.4 : 0.2;
  ctx.fillStyle = mode === 'day' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)';
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 30);
  ctx.fill();
  // Removed ctx.stroke() to delete the border between sides
  ctx.restore();

  // Accent corner marks (terminal-ish)
  ctx.save();
  ctx.globalAlpha = mode === 'day' ? 0.2 : 0.4;
  ctx.strokeStyle = '#615CED';
  ctx.lineWidth = 2;
  const m = 20;
  const corner = 30;
  // TL
  ctx.beginPath();
  ctx.moveTo(panelX + m, panelY + corner);
  ctx.lineTo(panelX + m, panelY + m);
  ctx.lineTo(panelX + corner, panelY + m);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(panelX + panelW - m, panelY + corner);
  ctx.lineTo(panelX + panelW - m, panelY + m);
  ctx.lineTo(panelX + panelW - corner, panelY + m);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(panelX + m, panelY + panelH - corner);
  ctx.lineTo(panelX + m, panelY + panelH - m);
  ctx.lineTo(panelX + corner, panelY + panelH - m);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(panelX + panelW - m, panelY + panelH - corner);
  ctx.lineTo(panelX + panelW - m, panelY + panelH - m);
  ctx.lineTo(panelX + panelW - corner, panelY + panelH - m);
  ctx.stroke();
  ctx.restore();
}

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
export default function RoomView({ agents = [], bubbles, bubbleFor, leaderboard, feed, onJumpToMessage, phaseText }) {
  const canvasDayRef = useRef(null);
  const canvasNightRef = useRef(null);
  const containerRef = useRef(null);

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
  const [isClosing, setIsClosing] = useState(false);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

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

  // Set canvas size (both layers)
  useEffect(() => {
    const displayWidth = Math.round(SCENE_NATIVE.width * scale);
    const displayHeight = Math.round(SCENE_NATIVE.height * scale);
    const canvases = [canvasDayRef.current, canvasNightRef.current].filter(Boolean);
    for (const canvas of canvases) {
      canvas.width = SCENE_NATIVE.width;
      canvas.height = SCENE_NATIVE.height;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
    }
  }, [scale]);

  // Draw room background (night)
  useEffect(() => {
    const canvas = canvasNightRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    drawRoomBackground(ctx, 'night');
  }, [scale]);

  // Draw room background (day)
  useEffect(() => {
    const canvas = canvasDayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    drawRoomBackground(ctx, 'day');
  }, [scale]);

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

    // If there's already a selected agent, switch immediately
    // Otherwise, show after a short delay (0ms = immediate)
    const agentData = getAgentData(agentId);
    if (agentData) {
      if (selectedAgent) {
        // Already have a card open, switch immediately
        setSelectedAgent(agentData);
      } else {
        // No card open, show after delay (currently 0ms = immediate)
        hoverTimerRef.current = setTimeout(() => {
          setSelectedAgent(agentData);
          hoverTimerRef.current = null;
        }, 0);
      }
    }
  };

  const handleAgentMouseLeave = () => {
    setHoveredAgent(null);
    // Clear timer if mouse leaves before 1.5 seconds
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

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
                onMouseEnter={() => handleAgentMouseEnter(agent.id)}
                onMouseLeave={handleAgentMouseLeave}
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
      </div>

      {/* Room Canvas */}
      <div className="room-canvas-container" ref={containerRef}>
          <div className="room-scene">
          <div
            className={`room-scene-wrapper ${sceneMode === 'day' ? 'is-day' : 'is-night'}`}
            style={{ position: 'relative', width: Math.round(SCENE_NATIVE.width * scale), height: Math.round(SCENE_NATIVE.height * scale) }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <canvas
                ref={canvasNightRef}
                className="room-canvas"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: sceneMode === 'night' ? 1 : 0,
                  transition: 'opacity 520ms ease',
                }}
              />
              <canvas
                ref={canvasDayRef}
                className="room-canvas"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: sceneMode === 'day' ? 1 : 0,
                  transition: 'opacity 520ms ease',
                }}
              />
            </div>

            {/* Celestial overlay (sun/moon), animates on day/night switch */}
            <div className="room-celestial-layer" aria-hidden="true">
              <div className="room-celestial room-celestial-sun" />
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

              // Position wrapper centered on the agent seat, then place bubble above.
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
                      top: -88,
                      left: isLeftSide ? 70 : 'auto',
                      right: isLeftSide ? 'auto' : 70,
                    }}
                  >
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

