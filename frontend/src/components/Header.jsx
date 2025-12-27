import React from 'react';
import { ASSETS } from '../config/constants';

export default function Header({
  statusText = '等待连接',
  phaseText = '准备中',
  onStartGame,
  startDisabled = false,
  startLabel = '开始游戏',
  onStopGame,
  stopDisabled = false,
  stopLabel = '终止游戏'
}) {
  return (
    <div className="header-title" style={{ flex: '0 1 auto', minWidth: 0 }}>
      <span
        className="header-link"
        style={{ cursor: 'default', padding: '4px 8px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        <img
          src={ASSETS.logo}
          alt="WolfMind"
          style={{ height: '24px', width: '24px' }}
        />
        WolfMind
      </span>

      <span style={{
        width: '2px',
        height: '16px',
        background: '#666',
        margin: '0 16px',
        display: 'inline-block',
        verticalAlign: 'middle'
      }} />

      <span style={{
        padding: '1px 6px',
        fontSize: '10px',
        fontWeight: 700,
        color: '#111827',
        background: '#f5f5f5',
        border: '1px solid #e5e7eb',
        borderRadius: '3px',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap'
      }}>
        {phaseText}
      </span>

      <span style={{
        padding: '1px 6px',
        fontSize: '10px',
        fontWeight: 700,
        color: '#111827',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '3px',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap'
      }}>
        {statusText}
      </span>

      <button
        type="button"
        onClick={onStartGame}
        disabled={!onStartGame || startDisabled}
        style={{
          marginLeft: 12,
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.5,
          borderRadius: 6,
          border: '1px solid #111827',
          background: startDisabled ? '#f3f4f6' : '#111827',
          color: startDisabled ? '#6b7280' : '#ffffff',
          cursor: (!onStartGame || startDisabled) ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {startLabel}
      </button>

      <button
        type="button"
        onClick={onStopGame}
        disabled={!onStopGame || stopDisabled}
        style={{
          marginLeft: 8,
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.5,
          borderRadius: 6,
          border: '1px solid #111827',
          background: stopDisabled ? '#f3f4f6' : '#ffffff',
          color: stopDisabled ? '#6b7280' : '#111827',
          cursor: (!onStopGame || stopDisabled) ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {stopLabel}
      </button>
    </div>
  );
}

