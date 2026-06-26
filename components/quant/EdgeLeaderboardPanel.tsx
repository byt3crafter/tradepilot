import React, { useEffect, useRef, useState } from 'react';
import { PmWallet } from '../../types';
import { Panel, edgeTone, fmtCents, fmtInt, fmtUsd, fmtPct, relTime, truncAddr } from './primitives';

const EdgeLeaderboardPanel: React.FC<{
  wallets: PmWallet[];
  loading: boolean;
  selected?: string;
  onSelect: (w: PmWallet) => void;
  lastUpdate?: Date | null;
}> = ({ wallets, loading, selected, onSelect, lastUpdate }) => {
  const rows = wallets.slice(0, 15);

  // Flash rows whose headline edge changed since the last refresh, so updates feel live.
  const prevRef = useRef<Record<string, number>>({});
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    const changed = new Set<string>();
    for (const w of wallets) {
      const prev = prevRef.current[w.address];
      if (prev !== undefined && prev !== w.edgeLcb) changed.add(w.address);
      prevRef.current[w.address] = w.edgeLcb;
    }
    if (!changed.size) return;
    setFlashSet(changed);
    const t = setTimeout(() => setFlashSet(new Set()), 700);
    return () => clearTimeout(t);
  }, [wallets]);

  const updatedLabel = lastUpdate ? lastUpdate.toLocaleTimeString('en-GB', { hour12: false }) : '—';

  return (
    <Panel
      label="Terminal Edge Leaderboard"
      live
      right={
        <span className="text-[var(--qt-dim)]" title="Last refresh">
          ↻ {updatedLabel}
        </span>
      }
      bodyClassName="p-0"
      className="flex flex-col min-h-0"
    >
      <div className="qt-scroll overflow-auto max-h-[440px]">
        {loading && rows.length === 0 ? (
          <div className="px-3 py-10 text-center text-[11px] text-[var(--qt-faint)]">Loading edge rankings…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-10 text-center text-[11px] text-[var(--qt-faint)]">
            No qualified wallets yet. Scan wallets in Leaderboard view.
          </div>
        ) : (
          <table className="w-full text-[10.5px] border-collapse tabular-nums">
            <thead>
              <tr className="sticky top-0 z-10 bg-[var(--qt-panel)] text-[8.5px] uppercase tracking-[0.1em] text-[var(--qt-faint)]">
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">#</th>
                <th className="text-left font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Wallet</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Edge ¢</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Mean ¢</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">$Edge ¢</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Win%</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Closed</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Vol $</th>
                <th className="text-left font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Focus</th>
                <th className="text-right font-normal px-2 py-1.5 border-b border-[var(--qt-border-bright)]">Last</th>
                <th className="text-center font-normal px-1.5 py-1.5 border-b border-[var(--qt-border-bright)]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w, i) => {
                const active = selected === w.address;
                const flash = flashSet.has(w.address);
                return (
                  <tr
                    key={`${w.address}-${flash ? 'f' : 'n'}`}
                    onClick={() => onSelect(w)}
                    className={`cursor-pointer border-b border-[var(--qt-border)] last:border-0 transition-colors ${
                      active
                        ? 'bg-[rgba(91,141,239,0.12)]'
                        : flash
                          ? 'qt-flash'
                          : 'hover:bg-[rgba(255,255,255,0.03)]'
                    }`}
                  >
                    <td className="px-2 py-1 text-right text-[var(--qt-faint)]">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-2 py-1 max-w-[150px]">
                      <span className="text-[var(--qt-text)] font-medium truncate inline-block max-w-[88px] align-middle">
                        {w.pseudonym || 'anon'}
                      </span>
                      <span className="text-[var(--qt-faint)] ml-1.5 align-middle">{truncAddr(w.address)}</span>
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${edgeTone(w.edgeLcb)}`}>{fmtCents(w.edgeLcb)}</td>
                    <td className={`px-2 py-1 text-right ${edgeTone(w.meanEdge)}`}>{fmtCents(w.meanEdge)}</td>
                    <td className={`px-2 py-1 text-right ${edgeTone(w.dollarEdge)}`}>{fmtCents(w.dollarEdge)}</td>
                    <td className="px-2 py-1 text-right text-[var(--qt-dim)]">{fmtPct(w.winRate)}</td>
                    <td className="px-2 py-1 text-right text-[var(--qt-dim)] whitespace-nowrap">
                      {fmtInt(w.nClosed)}
                      <span className="text-[var(--qt-faint)]">·{fmtInt(w.nEff)}</span>
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--qt-dim)] whitespace-nowrap">{fmtUsd(w.volume)}</td>
                    <td className="px-2 py-1">
                      {w.marketFocus ? (
                        <span className="inline-block px-1.5 py-px text-[8.5px] uppercase tracking-wide text-[var(--qt-dim)] border border-[var(--qt-border-bright)] rounded-[3px] truncate max-w-[80px] align-middle">
                          {w.marketFocus}
                        </span>
                      ) : (
                        <span className="text-[var(--qt-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--qt-faint)] whitespace-nowrap">{relTime(w.lastScanned)}</td>
                    <td className="px-1.5 py-1 text-center">
                      <a
                        href={`https://polymarket.com/profile/${w.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open on Polymarket"
                        className="text-[var(--qt-faint)] hover:text-[var(--qt-blue)] transition-colors"
                      >
                        ↗
                      </a>
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
