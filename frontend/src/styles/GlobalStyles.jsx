import React from 'react';

/**
 * Global CSS Styles for the EvoTraders Platform
 * Terminal-inspired, minimal, monochrome design
 */
export default function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        max-width: none;
      }
      body {
        font-family: 'IBM Plex Mono', monospace;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
        background: #f5f5f5;
        color: #000000;
        font-size: 11px;
        line-height: 1.5;
      }

      /* Import fonts */
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

      /* Layout */
      .app {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
        overflow: hidden;
        background: #f5f5f5;
        max-width: none;
      }

      /* Header */
      .header {
        background: #ffffff;
        border-bottom: 1px solid #e0e0e0;
        padding: 0;
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
        font-family: 'IBM Plex Mono', monospace;
        width: 100%;
        max-width: none;
        flex-wrap: wrap;
      }

      .header-title {
        padding: 18px 20px;
        font-size: 15px;
        font-weight: bold;
        letter-spacing: -0.01em;
        color: #000000;
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 0 1 auto;
        min-width: 0;
        flex-wrap: wrap;
      }

      /* Align header links when wrapped */
      @media (max-width: 1200px) {
        .header-title {
          justify-content: center;
          width: 100%;
          gap: 12px;
        }

        .header-title > span[style*="width: 2px"] {
          margin: 0 8px !important;
        }
      }

      /* Header right section - responsive wrapping */
      .header-right {
        flex: 0 1 auto;
      }

      /* Ensure header-right section takes full width when wrapped */
      @media (max-width: 1200px) {
        .header-right {
          width: 100%;
          margin-left: 0 !important;
          padding: 0 20px 10px 20px;
          justify-content: center;
        }
      }

      .header-link {
        font-size: 13px;
        font-weight: 600;
        color: #333333;
        text-decoration: none;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 3px;
      }

      .header-link:hover {
        color: #615CED;
        background: #f5f5f5;
      }

      .link-arrow {
        font-size: 12px;
        color: #666666;
        transition: transform 0.2s;
      }

      .header-link:hover .link-arrow {
        transform: translateY(-2px);
        color: #615CED;
      }

      .header-tabs {
        display: flex;
        align-items: stretch;
        flex: 1;
      }

      .header-tab {
        padding: 14px 24px;
        border: none;
        border-right: 1px solid #e0e0e0;
        border-radius: 0;
        background: transparent;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #666666;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        position: relative;
      }

      .header-tab:hover {
        background: #f5f5f5;
        color: #000000;
      }

      .header-tab.active {
        background: #615CED;
        color: #ffffff;
      }

      .header-tab:focus {
        background: #615CED;
        color: #ffffff;
        outline: none;
      }

      /* Unified inline status */
      .header-status-inline {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 16px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .header-status-inline .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .header-status-inline .status-dot.live {
        background: #00C853;
        box-shadow: 0 0 6px rgba(0, 200, 83, 0.6);
        animation: statusPulse 2s ease-in-out infinite;
      }

      .header-status-inline .status-dot.updating {
        background: #4CAF50;
        animation: statusPulse 0.8s ease-in-out infinite;
      }

      .header-status-inline .status-dot.offline {
        background: #FF1744;
      }

      @keyframes statusPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(0, 200, 83, 0.6); }
        50% { opacity: 0.5; box-shadow: 0 0 10px rgba(0, 200, 83, 0.9); }
      }

      .header-status-inline .status-text {
        text-transform: uppercase;
      }

      .header-status-inline .status-text.live {
        color: #00C853;
      }

      .header-status-inline .status-text.offline {
        color: #FF1744;
      }

      .header-status-inline .status-sep {
        color: #ccc;
      }

      .header-status-inline .market-text {
        text-transform: uppercase;
      }

      .header-status-inline .market-text.open {
        color: #00C853;
      }

      .header-status-inline .market-text.closed {
        color: #FF1744;
      }

      .header-status-inline .market-text.backtest {
        color: #888;
      }

      .header-status-inline .time-text {
        color: #666;
      }

      /* Ticker Bar */
      .ticker-bar {
        background: #000000;
        border-bottom: 1px solid #333333;
        padding: 12px 0;
        display: flex;
        align-items: center;
        overflow: hidden;
        flex-shrink: 0;
        width: 100%;
        max-width: none;
        position: relative;
      }

      .ticker-track {
        display: flex;
        align-items: center;
        animation: ticker-scroll 40s linear infinite;
        will-change: transform;
      }

      .ticker-track:hover {
        animation-play-state: paused;
      }

      @keyframes ticker-scroll {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(calc(-100% / 2));
        }
      }

      .ticker-group {
        display: flex;
        align-items: center;
        gap: 32px;
        padding: 0 16px;
        flex-shrink: 0;
      }

      .ticker-item {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .ticker-symbol {
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 1px;
      }

      .ticker-price {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        position: relative;
        overflow: hidden;
        display: inline-block;
        min-width: 60px;
      }

      .ticker-price-value {
        display: inline-block;
        transition: transform 0.3s ease-out;
      }

      .ticker-price-value.rolling {
        animation: roll 0.5s ease-out;
      }

      @keyframes roll {
        0% {
          transform: translateY(-100%);
          opacity: 0;
        }
        50% {
          opacity: 0.5;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .ticker-change {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 0;
      }

      .ticker-change.positive {
        color: #00C853;
        background: rgba(0, 200, 83, 0.1);
      }

      .ticker-change.negative {
        color: #FF1744;
        background: rgba(255, 23, 68, 0.1);
      }

      .ticker-change:not(.positive):not(.negative) {
        color: #666666;
        background: transparent;
      }

      .portfolio-value {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 20px;
        background: #000000;
        z-index: 10;
      }

      .portfolio-value::before {
        content: '';
        position: absolute;
        left: -40px;
        top: 0;
        bottom: 0;
        width: 40px;
        background: linear-gradient(to right, transparent, #000000);
        pointer-events: none;
      }

      .portfolio-label {
        font-size: 11px;
        font-weight: 700;
        color: #999999;
        letter-spacing: 1px;
      }

      .portfolio-amount {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
      }

      /* Main Container */
      .main-container {
        flex: 1;
        display: flex;
        overflow: hidden;
        background: #f5f5f5;
        position: relative;
        width: 100%;
        max-width: none;
      }

      .left-panel {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #ffffff;
        min-width: 400px;
        max-width: none;
      }

      .resizer {
        width: 2px;
        background: #000000;
        cursor: col-resize;
        flex-shrink: 0;
        transition: background 0.2s;
      }

      .resizer:hover {
        background: #000000;
      }

      .resizer.resizing {
        background: #000000;
      }

      .right-panel {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #ffffff;
        min-width: 300px;
        max-width: none;
      }

      /* Chart Section */
      .chart-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #ffffff;
        position: relative;
        width: 100%;
        max-width: none;
      }

      .chart-container {
        flex: 1;
        padding: 24px;
        overflow: hidden;
        position: relative;
        background: #ffffff;
        width: 100%;
        max-width: none;
      }

      /* Room View */
      .room-view {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #ffffff;
        position: relative;
        width: 100%;
        max-width: none;
      }

      .room-agents-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-top: 1px solid #e0e0e0;
        border-bottom: 1px solid #e0e0e0;
        background: #ffffff;
        flex-wrap: wrap;
        position: relative;
        z-index: 1000;
      }

      .agent-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        cursor: pointer;
      }

      .agent-indicator.speaking {
        transform: scale(1.05);
      }

      .agent-indicator.hovered {
        transform: scale(1.1);
      }

      .agent-indicator:hover {
        transform: scale(1.08);
      }

      .agent-avatar-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .agent-avatar {
        height: 40px;
        width: auto;
        object-fit: contain;
        display: block;
      }

      .agent-indicator-dot {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #e0e0e0;
        border: 2px solid #ffffff;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .agent-indicator.speaking .agent-indicator-dot {
        background: #00C853;
        box-shadow: 0 0 12px rgba(0, 200, 83, 0.8);
        transform: scale(1.2);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .agent-name {
        font-size: 9px;
        line-height: 1.1;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #666666;
        text-align: center;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .agent-indicator.speaking .agent-name {
        color: #000000;
      }

      .agent-rank-medal {
        position: absolute;
        top: -8px;
        right: -32px;
        font-size: 16px;
        line-height: 1;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        z-index: 10;
      }

      .agent-hint-text {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        color: #000000;
        font-family: 'IBM Plex Mono', monospace;
        letter-spacing: 0.5px;
        white-space: nowrap;
        opacity: 0.7;
      }

      .room-insights-popover {
        position: absolute;
        top: calc(100% + 12px);
        left: 50%;
        transform: translateX(-50%);
        width: min(560px, calc(100vw - 24px));
        max-height: 60vh;
        overflow: auto;
        padding: 12px 14px;
        border-radius: 12px;
        border: 2px solid #000000;
        background: #ffffff;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
        z-index: 1200;
      }

      .room-insights-title {
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.6px;
        font-size: 12px;
        margin-bottom: 10px;
      }

      .room-insights-section {
        margin-top: 10px;
      }

      .room-insights-section-title {
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 800;
        font-size: 11px;
        opacity: 0.8;
        margin-bottom: 6px;
      }

      .room-insights-empty {
        font-size: 12px;
        opacity: 0.75;
        line-height: 1.4;
      }

      .room-insights-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .room-insights-row {
        display: grid;
        grid-template-columns: 96px 1fr;
        gap: 10px;
        align-items: start;
      }

      .room-insights-key {
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 800;
        font-size: 11px;
        padding: 6px 8px;
        border: 2px solid #000000;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.04);
        line-height: 1.2;
        white-space: nowrap;
      }

      .room-insights-val {
        font-size: 12px;
        line-height: 1.45;
        padding-top: 4px;
      }

      .room-insights-text {
        font-size: 12px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .agent-card-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999;
      }

      .room-scene-wrapper {
        position: relative;
      }

      .room-celestial-layer {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 12; /* above canvas, below agents/bubbles */
      }

      .room-celestial {
        position: absolute;
        width: 118px;
        height: 118px;
        border-radius: 999px;
        transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease;
        will-change: transform, opacity;
        transform-style: preserve-3d;
      }

      .room-celestial-sun {
        left: 34px;
        top: 32px;
        background: radial-gradient(circle at 30% 30%, #FFF9C4 0%, #FFD54F 30%, #F57C00 70%, #E65100 100%);
        border: 3px solid #000000;
        box-shadow:
          0 22px 40px rgba(0, 0, 0, 0.18),
          0 0 48px rgba(255, 167, 38, 0.35),
          inset -14px -18px 26px rgba(0,0,0,0.18),
          inset 12px 10px 18px rgba(255,255,255,0.22);
        opacity: 0;
        transform: translateX(-260px) rotate(-180deg);
      }

      .room-celestial-sun::before {
        content: "";
        position: absolute;
        inset: 10px;
        border-radius: 999px;
        background: radial-gradient(circle at 28% 28%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.22) 28%, rgba(255,255,255,0) 62%);
        transform: translateZ(1px);
        pointer-events: none;
      }

      .room-celestial-sun::after {
        content: "";
        position: absolute;
        inset: -3px;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%);
        opacity: 0.35;
        pointer-events: none;
      }

      .room-celestial-moon {
        right: 34px;
        top: 32px;
        background: radial-gradient(circle at 30% 30%, #F8FAFC 0%, #E2E8F0 40%, #94A3B8 80%, #475569 100%);
        border: 3px solid #F8FAFC;
        box-shadow:
          0 22px 40px rgba(0, 0, 0, 0.22),
          0 0 44px rgba(148, 163, 184, 0.22),
          inset -16px -18px 28px rgba(0,0,0,0.35),
          inset 10px 10px 18px rgba(255,255,255,0.16);
        opacity: 0;
        transform: translateX(260px) rotate(180deg);
      }

      .room-celestial-moon::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: radial-gradient(circle at 28% 26%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 35%, rgba(0,0,0,0) 64%);
        pointer-events: none;
      }

      /* Add some "craters" to the moon using pseudo-elements if possible, or just better gradient */
      .room-celestial-moon::before {
        content: "";
        position: absolute;
        top: 20%;
        left: 25%;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(0,0,0,0.05);
        box-shadow: 40px 30px 0 -4px rgba(0,0,0,0.05), 10px 60px 0 -2px rgba(0,0,0,0.05);
      }

      .room-scene-wrapper.is-day .room-celestial-sun {
        opacity: 1;
        transform: translateX(0) rotate(0deg);
      }

      .room-scene-wrapper.is-day .room-celestial-moon {
        opacity: 0;
        transform: translateX(280px) rotate(180deg);
      }

      .room-scene-wrapper.is-night .room-celestial-moon {
        opacity: 1;
        transform: translateX(0) rotate(0deg);
      }

      .room-scene-wrapper.is-night .room-celestial-sun {
        opacity: 0;
        transform: translateX(-280px) rotate(-180deg);
      }

      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 0 12px rgba(0, 200, 83, 0.8);
        }
        50% {
          box-shadow: 0 0 20px rgba(0, 200, 83, 1);
        }
      }

      @keyframes cardAppear {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @keyframes fadeIn {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      @keyframes clipReveal {
        0% {
          clip-path: inset(0 100% 0 0);
        }
        100% {
          clip-path: inset(0 0 0 0);
        }
      }

      @keyframes clipHide {
        0% {
          clip-path: inset(0 0 0 0);
        }
        100% {
          clip-path: inset(0 0 0 100%);
        }
      }

      .room-canvas-container {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 6px;
        position: relative;
      }

      .room-scene {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .room-canvas {
        display: block;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }

      .room-bubble {
        position: relative;
        width: clamp(280px, 38vw, 480px);
        max-width: 480px;
        max-height: 280px;
        font-size: 12px;
        background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
        color: #000000;
        padding: 12px 14px;
        border: 2px solid #615CED;
        border-radius: 12px;
        box-shadow: 4px 6px 0 0 rgba(97, 92, 237, 0.15);
        font-family: 'IBM Plex Mono', monospace;
        line-height: 1.5;
        animation: bubbleAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      @keyframes bubbleAppear {
        0% {
          opacity: 0;
          transform: scale(0.5) translateY(10px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      /* 移除伪元素，连接线通过内联样式实现 */
      .room-bubble::before,
      .room-bubble::after {
        display: none;
      }

      .bubble-action-buttons {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        z-index: 10;
      }

      .bubble-jump-btn,
      .bubble-close-btn {
        outline: none;
        width: 18px;
        height: 18px;
        padding: 0;
        border: none;
        background: transparent;
        color: #666666;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bubble-jump-btn:hover,
      .bubble-close-btn:hover {
        outline: none;
        color: #000000;
        transform: scale(1.15);
      }

      .bubble-jump-btn:active,
      .bubble-close-btn:active {
        outline: none;
        transform: scale(0.95);
      }

      .bubble-jump-btn:focus,
      .bubble-close-btn:focus {
        outline: none;
        box-shadow: none;
      }

      .bubble-close-btn {
        font-size: 16px;
        font-weight: bold;
      }

      .room-bubble-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .bubble-model-icon {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: contain;
        flex-shrink: 0;
      }

      .room-bubble-name {
        font-weight: 900;
        font-size: 11px;
        letter-spacing: 0.5px;
        color: #000000;
        flex: 1;
      }

      .room-bubble-divider {
        height: 1px;
        background: #e0e0e0;
        margin: 6px 0 8px;
      }

      .room-bubble-content {
        word-wrap: break-word;
        white-space: pre-wrap;
        font-size: 12px;
        line-height: 1.7;
        position: relative;
        flex: 1;
        overflow-y: auto;
        max-height: 180px;
        padding-right: 4px;
      }

      /* 自定义滚动条样式 */
      .room-bubble-content::-webkit-scrollbar {
        width: 6px;
      }

      .room-bubble-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
      }

      .room-bubble-content::-webkit-scrollbar-thumb {
        background: rgba(97, 92, 237, 0.4);
        border-radius: 3px;
      }

      .room-bubble-content::-webkit-scrollbar-thumb:hover {
        background: rgba(97, 92, 237, 0.6);
      }

      .bubble-expand-btn {
        padding: 0;
        margin-left: 4px;
        border: none;
        background: none;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        color: #666666;
        cursor: pointer;
        transition: color 0.15s;
        display: inline;
        vertical-align: baseline;
      }

      .bubble-expand-btn:hover {
        color: #000000;
      }

      .bubble-expand-btn:focus {
        outline: none;
      }

      /* Replay Button Container */
      .replay-button-container {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
      }

      .replay-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #000000;
        color: #ffffff;
        border: 1px solid #000000;
        border-radius: 0;
        font-size: 11px;
        font-weight: 700;
        font-family: 'IBM Plex Mono', monospace;
        letter-spacing: 0.5px;
        cursor: pointer;
        box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }

      .replay-button:hover:not(:disabled) {
        background: #333333;
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 0 rgba(0, 0, 0, 0.3);
      }

      .replay-button:active:not(:disabled) {
        transform: translate(1px, 1px);
        box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 0.2);
      }

      .replay-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .replay-icon {
        font-size: 14px;
        animation: replayIconPulse 2s ease-in-out infinite;
      }

      @keyframes replayIconPulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      /* Replay Indicator */
      .replay-indicator {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: #000000;
        border: 1px solid #000000;
        border-radius: 0;
        z-index: 200;
        box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.2);
      }

      .replay-status {
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        font-family: 'IBM Plex Mono', monospace;
        letter-spacing: 0.5px;
        animation: replayStatusBlink 1.5s ease-in-out infinite;
      }

      @keyframes replayStatusBlink {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      .stop-replay-button {
        padding: 4px 10px;
        background: #ffffff;
        color: #000000;
        border: 1px solid #000000;
        border-radius: 0;
        font-size: 10px;
        font-weight: 700;
        font-family: 'IBM Plex Mono', monospace;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .stop-replay-button:hover {
        background: #000000;
        color: #ffffff;
      }

      .stop-replay-button:active {
        transform: translate(1px, 1px);
      }

      /* View Toggle Button */
      .view-toggle-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 20;
        width: 32px;
        height: 80px;
        background: #ffffff;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        font-size: 18px;
        color: #666666;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .view-toggle-btn:hover {
        background: #000000;
        border-color: #000000;
        color: #ffffff;
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }

      .view-toggle-btn:active {
        transform: translateY(-50%) scale(0.95);
      }

      .view-toggle-btn.left {
        left: 0;
        border-left: none;
        border-radius: 0 4px 4px 0;
      }

      .view-toggle-btn.right {
        right: 0;
        border-right: none;
        border-radius: 4px 0 0 4px;
      }

      .view-toggle-btn:focus {
        outline: none;
      }

      /* View Transition */
      .view-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        padding-top: 40px;
      }

      /* View Navigation Bar */
      .view-nav-bar {
        position: absolute;
        top: 4px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        display: flex;
        gap: 0;
        background: #ffffff;
        border: 1px solid #000000;
        border-radius: 10px;
        overflow: hidden;
      }

      .view-nav-btn {
        padding: 4px 14px;
        background: #ffffff;
        color: #000000;
        border: none;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .view-nav-btn:hover:not(.active) {
        background: #f5f5f5;
      }

      .view-nav-btn.active {
        background: #000000;
        color: #ffffff;
      }

      .view-nav-btn:focus {
        outline: none;
      }

      /* Three-view slider (Room / Chart / Statistics) */
      .view-slider-three {
        position: absolute;
        width: 300%;
        height: 100%;
        display: flex;
        transition: transform 1.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .view-slider-three.normal-speed {
        transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .view-slider-three.show-room {
        transform: translateX(0);
      }

      .view-slider-three.show-chart {
        transform: translateX(-33.333%);
      }

      .view-slider-three.show-statistics {
        transform: translateX(-66.666%);
      }

      /* Four-view slider (Rules / Room / Chart / Statistics) */
      .view-slider-four {
        position: absolute;
        top: 40px;
        width: 400%;
        height: calc(100% - 40px);
        display: flex;
        transition: transform 1.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .view-slider-four.normal-speed {
        transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .view-slider-four.show-rules {
        transform: translateX(0);
      }

      .view-slider-four.show-room {
        transform: translateX(-25%);
      }

      .view-slider-four.show-chart {
        transform: translateX(-50%);
      }

      .view-slider-four.show-statistics {
        transform: translateX(-75%);
      }

      .view-panel {
        flex: 0 0 33.333%;
        width: 33.333%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* View panel for four-view slider */
      .view-slider-four .view-panel {
        flex: 0 0 25%;
        width: 25%;
      }

      /* Chart Tabs - Floating inside chart */
      .chart-tabs-floating {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        gap: 0;
        border: 1px solid #cccccc;
        background: #ffffff;
        z-index: 10;
      }

      .chart-tab {
        padding: 4px 8px;
        border: none;
        border-right: 1px solid #cccccc;
        border-radius: 0;
        background: #ffffff;
        font-family: inherit;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #666666;
        cursor: pointer;
        transition: all 0.15s;
      }

      .chart-tab:last-child {
        border-right: none;
      }

      .chart-tab:hover {
        background: #f5f5f5;
        color: #000000;
      }

      .chart-tab.active {
        background: #000000;
        color: #ffffff;
        border-color: #000000;
      }

      .chart-tab:focus {
        outline: none;
      }

      .chart-tab.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        color: #999999;
      }

      .chart-tab.disabled:hover {
        background: #ffffff;
        color: #999999;
      }

      /* Agent Feed - Minimalist Design */
      .agent-feed {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        width: 100%;
        max-width: none;
        background: transparent;
      }

      .agent-feed-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
        background: #ffffff;
        flex-shrink: 0;
      }

      .agent-feed-title {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
      }

      .agent-filter-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .agent-filter-label {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        color: #666666;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      /* Custom Select Dropdown */
      .custom-select-wrapper {
        position: relative;
        min-width: 160px;
      }

      .custom-select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 6px 10px;
        background: #ffffff;
        border: 1px solid #000000;
        border-radius: 0;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        color: #000000;
        cursor: pointer;
        transition: all 0.2s;
        outline: none;
        gap: 8px;
      }

      .custom-select-trigger:hover {
        background-color: #f5f5f5;
      }

      .custom-select-trigger:focus {
        border-color: #000000;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
      }

      .custom-select-value {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }

      .custom-select-value span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .custom-select-arrow {
        font-size: 8px;
        color: #666666;
        flex-shrink: 0;
        transition: transform 0.2s;
      }

      .custom-select-trigger:hover .custom-select-arrow {
        color: #000000;
      }

      .custom-select-dropdown {
        position: absolute;
        top: calc(100% + 2px);
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #000000;
        border-radius: 0;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.1);
      }

      .custom-select-option {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        color: #000000;
        cursor: pointer;
        transition: all 0.15s;
        border-bottom: 1px solid #f0f0f0;
      }

      .custom-select-option:last-child {
        border-bottom: none;
      }

      .custom-select-option:hover {
        background: #f5f5f5;
      }

      .custom-select-option.selected {
        background: #000000;
        color: #ffffff;
      }

      .select-model-icon {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        object-fit: contain;
        flex-shrink: 0;
      }

      .feed-header {
        padding: 20px 20px 12px;
        background: transparent;
        width: 100%;
        max-width: none;
        position: relative;
        text-align: center;
      }

      .feed-title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.1em;
        line-height: 0.9;
        margin: 0 0 12px 0;
        color: #000000;
        text-transform: uppercase;
        font-family: 'IBM Plex Mono', monospace;
        position: relative;
        display: inline-block;
      }

      .feed-title::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -12px;
        transform: translateX(-50%);
        width: 60%;
        height: 1px;
        background: #cccccc;
      }

      .feed-subtitle {
        font-size: 10px;
        color: #666666;
        font-family: 'IBM Plex Mono', monospace;
        margin-top: 16px;
        line-height: 1.4;
      }

      .feed-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: transparent;
        width: 100%;
        max-width: none;
      }

      /* Feed Item - Card Style with Shadow and Spacing */
      .feed-item {
        border: 1px solid rgb(78, 75, 75);
        border-radius: 4px;
        padding: 16px 20px;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      }

      .feed-item:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
        border-color: rgb(78, 75, 75);
      }

      .feed-item-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .feed-item-title {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }

      .feed-item-time {
        margin-left: auto;
        font-size: 10px;
        color: #999999;
        font-family: 'IBM Plex Mono', monospace;
      }

      .feed-live-badge {
        font-size: 9px;
        font-weight: 700;
        color: #00C853;
        letter-spacing: 0.5px;
      }

      .feed-item-subtitle {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 10px;
        line-height: 1.4;
      }

      .feed-item-content {
        font-size: 13px;
        line-height: 1.6;
        color: #333333;
        word-wrap: break-word;
        font-family: 'IBM Plex Mono', monospace;
        white-space: pre-wrap;
      }

      /* Conference Messages */
      .conference-messages {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
      }

      .conf-message-item {
        font-size: 12px;
        line-height: 1.5;
        color: #333333;
      }

      .conf-agent-name {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.3px;
        margin-bottom: 4px;
      }

      .conf-message-content-wrapper {
        padding-left: 4ch;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .conf-message-content {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        color: #333333;
        flex: 1;
        min-width: 0;
        white-space: pre-wrap;
      }

      .conf-expand-btn {
        padding: 0;
        border: none;
        background: none;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 10px;
        font-weight: 600;
        color: #666666;
        cursor: pointer;
        transition: color 0.15s;
        flex-shrink: 0;
      }

      .conf-expand-btn:hover {
        color: #000000;
      }

      .conf-expand-btn:focus {
        outline: none;
      }

      /* Expand Button */
      .feed-expand-btn {
        margin-top: 8px;
        padding: 0;
        border: none;
        background: none;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 10px;
        font-weight: 600;
        color: #666666;
        cursor: pointer;
        transition: color 0.15s;
        text-align: left;
      }

      .feed-expand-btn:hover {
        color: #000000;
      }

      .feed-expand-btn:focus {
        outline: none;
      }

      /* Statistics/Performance Pages */
      .leaderboard-page, .performance-page {
        flex: 1;
        overflow-y: auto;
        padding: 16px 24px 24px;
        background: #f5f5f5;
        width: 100%;
        max-width: none;
      }

      .section {
        margin-bottom: 20px;
        background: #ffffff;
        border: 1px solid #000000;
        padding: 16px;
        width: 100%;
        max-width: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #000000;
      }

      .section-title {
        font-size: 16px;
        font-weight: bold;
        letter-spacing: -0.01em;
        margin: 0;
        color: #000000;
        text-transform: uppercase;
      }

      .section-tabs {
        display: flex;
        gap: 0;
        border: 1px solid #000000;
      }

      .section-tab {
        padding: 8px 16px;
        border: none;
        border-right: 1px solid #000000;
        border-radius: 0;
        background: #ffffff;
        font-family: inherit;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #000000;
        cursor: pointer;
        transition: all 0.15s;
      }

      .section-tab:last-child {
        border-right: none;
      }

      .section-tab:hover {
        background: #f5f5f5;
      }

      .section-tab.active {
        background: #000000;
        color: #ffffff;
      }

      .section-tab:focus {
        outline: none;
      }

      /* Tables */
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        table-layout: auto;
        max-width: none;
      }

      .table-wrapper {
        width: 100%;
        overflow-x: auto;
        max-width: none;
      }

      .data-table thead th {
        background: #000000;
        color: #ffffff;
        padding: 10px 12px;
        text-align: left;
        font-weight: 700;
        letter-spacing: 1px;
        font-size: 9px;
        border-right: 1px solid #000000;
        text-transform: uppercase;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .data-table thead th:last-child {
        border-right: none;
      }

      .data-table tbody tr {
        border-bottom: 1px solid #f0f0f0;
        transition: all 0.1s;
      }

      .data-table tbody tr:hover {
        background: #fafafa;
      }

      .data-table tbody td {
        padding: 10px 12px;
        color: #000000;
      }

      .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        padding: 6px 10px;
        background: #ffffff;
        border: 2px solid #e0e0e0;
        font-weight: 700;
        font-size: 11px;
        color: #000000;
      }

      .rank-badge.first {
        background: #000000;
        border-color: #000000;
        color: #ffffff;
      }

      .rank-badge.second {
        background: #ffffff;
        border-color: #000000;
        color: #000000;
      }

      .rank-badge.third {
        background: #ffffff;
        border-color: #666666;
        color: #666666;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        width: 100%;
        max-width: none;
      }

      .stat-card {
        border: 1px solid #000000;
        padding: 16px;
        background: #fafafa;
        transition: all 0.2s;
      }

      .stat-card:hover {
        border-color: #000000;
        box-shadow: 0 2px 2px rgba(0,0,0,0.1);
      }

      .stat-card-label {
        font-size: 11px;
        color: #666666;
        font-weight: 700;
        letter-spacing: 1px;
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .stat-card-value {
        font-size: 28px;
        font-weight: 700;
        color: #000000;
      }

      .stat-card-value.positive { color: #00C853; }
      .stat-card-value.negative { color: #FF1744; }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #999999;
        font-size: 12px;
        letter-spacing: 0.5px;
      }

      /* Pagination Controls */
      .pagination-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 0;
        margin-top: 16px;
        border-top: 1px solid #e0e0e0;
      }

      .pagination-btn {
        padding: 6px 12px;
        border: 1px solid #000000;
        border-radius: 0;
        background: #ffffff;
        font-family: inherit;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #000000;
        cursor: pointer;
        transition: all 0.15s;
        text-transform: uppercase;
      }

      .pagination-btn:hover:not(:disabled) {
        background: #000000;
        color: #ffffff;
      }

      .pagination-btn:disabled {
        border-color: #e0e0e0;
        color: #cccccc;
        cursor: not-allowed;
        opacity: 0.4;
      }

      .pagination-btn:focus {
        outline: none;
      }

      .pagination-info {
        font-size: 10px;
        font-weight: 700;
        color: #666666;
        letter-spacing: -0.01em;
        font-family: 'IBM Plex Mono', monospace;
      }

      /* Scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f0f0f0;
      }

      ::-webkit-scrollbar-thumb {
        background: #cccccc;
        border-radius: 0;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #999999;
      }

      /* Hide scrollbar for statistics tables */
      .statistics-table-container {
        overflow-y: auto;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
      }

      .statistics-table-container::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }

      /* Responsive */
      @media (max-width: 900px) {
        .app {
          height: auto;
          min-height: 100vh;
        }

        .main-container {
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          height: auto;
          flex: 1;
        }

        .resizer {
          display: none;
        }

        .left-panel {
          width: 100% !important;
          min-width: 100%;
          height: 100vh;
          min-height: 600px;
          flex: 0 0 auto;
          border-bottom: 2px solid #000000;
        }

        .right-panel {
          width: 100% !important;
          min-width: 100%;
          height: auto;
          min-height: 50vh;
          flex: 0 0 auto;
          overflow-y: visible;
        }

        .agent-feed {
          height: auto;
          overflow-y: visible;
        }

        .feed-content {
          overflow-y: visible;
        }
      }

      @media (max-width: 600px) {
        .header-tabs {
          overflow-x: auto;
        }

        .header-tab {
          padding: 12px 16px;
          font-size: 11px;
        }

        .leaderboard-page, .performance-page {
          padding: 16px;
        }

        .section {
          padding: 12px;
        }

        .data-table {
          font-size: 10px;
          display: block;
          overflow-x: auto;
        }

        .data-table thead th,
        .data-table tbody td {
          padding: 8px 6px;
          white-space: nowrap;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .ticker-bar {
          padding: 8px 12px;
          gap: 16px;
        }
      }
    `}</style>
  );
}

