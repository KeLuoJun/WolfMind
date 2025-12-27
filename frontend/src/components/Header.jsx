import React from 'react';
import { ASSETS } from '../config/constants';

export default function Header({ statusText = '等待连接', phaseText = '准备中' }) {
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
    </div>
  );
}

