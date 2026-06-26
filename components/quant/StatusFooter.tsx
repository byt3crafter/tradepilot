import React from 'react';
import { LiveDot } from './primitives';

const StatusFooter: React.FC<{
  online: boolean;
  lastUpdate: Date | null;
  walletCount: number;
}> = ({ online, lastUpdate, walletCount }) => (
  <div className="qt-panel flex items-center gap-3 px-3 h-7 text-[9px] uppercase tracking-[0.12em] text-[var(--qt-dim)] flex-wrap">
    <span className="flex items-center gap-1.5">
      <LiveDot tone={online ? 'green' : 'red'} />
      <span className={online ? 'text-[var(--qt-green)]' : 'text-[var(--qt-red)]'}>
        Agent {online ? 'Online' : 'Offline'}
      </span>
    </span>
    <span className="text-[var(--qt-faint)]">·</span>
    <span>feed: polymarket</span>
    <span className="text-[var(--qt-faint)]">·</span>
    <span>last update {lastUpdate ? lastUpdate.toLocaleTimeString('en-GB', { hour12: false }) : '—'}</span>
    <span className="text-[var(--qt-faint)]">·</span>
    <span>{walletCount.toLocaleString('en-US')} wallets tracked</span>
  </div>
);

export default StatusFooter;
