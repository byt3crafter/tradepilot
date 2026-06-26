import React from 'react';
import { PmWallet } from '../../types';
import { Panel, edgeTone, fmtCents, fmtInt, truncAddr } from './primitives';

const EdgeLeaderboardPanel: React.FC<{
  wallets: PmWallet[];
  loading: boolean;
  selected?: string;
  onSelect: (w: PmWallet) => void;
}> = ({ wallets, loading, selected, onSelect }) => {
  const rows = wallets.slice(0, 12);
  return (
    <Panel
      label="Edge Leaderboard"
      live
      right={<span>95% LCB ¢/share</span>}
      bodyClassName="p-0"
      className="flex flex-col min-h-0"
    >
      <div className="qt-scroll overflow-y-auto max-h-[420px]">
        {loading && rows.length === 0 ? (
          <div className="px-3 py-10 text-center text-[11px] text-[var(--qt-faint)]">Loading edge rankings…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-10 text-center text-[11px] text-[var(--qt-faint)]">
            No qualified wallets yet. Scan wallets in Leaderboard view.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.12em] text-[var(--qt-faint)] border-b border-[var(--qt-border)]">
                <th className="text-left font-normal px-3 py-1.5 w-8">#</th>
                <th className="text-left font-normal py-1.5">Wallet</th>
                <th className="text-right font-normal py-1.5">Edge</th>
                <th className="text-right font-normal py-1.5 pr-2">n · n_eff</th>
                <th className="text-left font-normal py-1.5 pr-3">Focus</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w, i) => {
                const active = selected === w.address;
                return (
                  <tr
                    key={w.id || w.address}
                    onClick={() => onSelect(w)}
                    className={`border-b border-[var(--qt-border)] last:border-0 cursor-pointer transition-colors ${
                      active ? 'bg-[rgba(91,141,239,0.10)]' : 'hover:bg-[rgba(255,255,255,0.025)]'
                    }`}
                  >
                    <td className="px-3 py-2 text-[var(--qt-faint)]">{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-2">
                      <div className="text-[var(--qt-text)] font-medium truncate max-w-[150px]">
                        {w.pseudonym || 'anon'}
                      </div>
                      <div className="text-[9px] text-[var(--qt-faint)]">{truncAddr(w.address)}</div>
                    </td>
                    <td className={`py-2 text-right font-semibold text-[13px] ${edgeTone(w.edgeLcb)}`}>
                      {fmtCents(w.edgeLcb)}
                    </td>
                    <td className="py-2 pr-2 text-right text-[var(--qt-dim)] whitespace-nowrap">
                      {fmtInt(w.nClosed)}<span className="text-[var(--qt-faint)]"> · {fmtInt(w.nEff)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      {w.marketFocus ? (
                        <span className="inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--qt-dim)] border border-[var(--qt-border-bright)] rounded-[3px] truncate max-w-[90px]">
                          {w.marketFocus}
                        </span>
                      ) : (
                        <span className="text-[var(--qt-faint)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
};

export default EdgeLeaderboardPanel;
