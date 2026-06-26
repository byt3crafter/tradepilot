import React, { useCallback, useEffect, useState } from 'react';
import { PmWallet, QuantVerdict } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Panel, edgeTone, fmtCents, fmtInt, fmtPct } from './primitives';

const verdictTone: Record<QuantVerdict['verdict'], string> = {
  COPY: 'text-[var(--qt-green)] border-[var(--qt-green)]',
  WATCH: 'text-[var(--qt-amber)] border-[var(--qt-amber)]',
  AVOID: 'text-[var(--qt-red)] border-[var(--qt-red)]',
};

const Big: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--qt-dim)]">{label}</span>
    <span className={`text-[20px] leading-none font-semibold ${tone ?? 'text-[var(--qt-text)]'}`}>{value}</span>
  </div>
);

const WalletCardPanel: React.FC<{ wallet: PmWallet | null }> = ({ wallet }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<QuantVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  // Reset verdict state whenever the focused wallet changes.
  useEffect(() => {
    setVerdict(null);
    setError(null);
    setNeedsConnect(false);
  }, [wallet?.address]);

  const run = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    setNeedsConnect(false);
    try {
      const token = await getToken();
      const v = await api.quantVerdict(wallet.address, token);
      setVerdict(v);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('CHATGPT_NOT_CONNECTED')) setNeedsConnect(true);
      else if (msg.includes('15')) setError('Need ≥15 closed positions for a verdict.');
      else setError(msg || 'Could not generate a verdict.');
    } finally {
      setLoading(false);
    }
  }, [wallet, getToken]);

  return (
    <Panel
      label="Wallet · Edge Detail"
      live={!!wallet}
      right={wallet ? <span>{wallet.qualified ? 'QUALIFIED' : 'PROVISIONAL'}</span> : undefined}
    >
      {!wallet ? (
        <div className="py-10 text-center text-[11px] text-[var(--qt-faint)]">
          Select a wallet from the leaderboard.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[var(--qt-text)] truncate">
                {wallet.pseudonym || 'anon'}
              </div>
              <div className="text-[9px] text-[var(--qt-faint)] break-all">{wallet.address}</div>
            </div>
            <a
              href={`https://polymarket.com/profile/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--qt-blue)] hover:underline whitespace-nowrap flex-shrink-0"
            >
              PM ↗
            </a>
          </div>

          {/* Headline edge */}
          <div className="flex flex-col gap-1 py-2 border-y border-[var(--qt-border)]">
            <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--qt-dim)]">
              Realized edge · 95% LCB
            </span>
            <span className={`text-[34px] leading-none font-bold ${edgeTone(wallet.edgeLcb)}`}>
              {fmtCents(wallet.edgeLcb)}
              <span className="text-[11px] font-medium text-[var(--qt-faint)] ml-2">/ share</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Big label="Mean edge" value={fmtCents(wallet.meanEdge)} tone={edgeTone(wallet.meanEdge)} />
            <Big label="$ Edge" value={fmtCents(wallet.dollarEdge)} tone={edgeTone(wallet.dollarEdge)} />
            <Big label="Closed · n_eff" value={`${fmtInt(wallet.nClosed)} · ${fmtInt(wallet.nEff)}`} />
            <Big label="Win rate" value={<span className="text-[var(--qt-dim)]">{fmtPct(wallet.winRate)}</span>} />
          </div>

          {/* AI verdict */}
          <div className="pt-3 border-t border-[var(--qt-border)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--qt-dim)]">AI Verdict</span>
              <button
                type="button"
                onClick={run}
                disabled={loading}
                className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold border border-[var(--qt-border-bright)] rounded-[3px] text-[var(--qt-text)] hover:border-[var(--qt-blue)] hover:text-[var(--qt-blue)] transition-colors disabled:opacity-40"
              >
                {loading ? 'Analyzing…' : verdict ? 'Re-run' : 'Run Verdict'}
              </button>
            </div>

            {needsConnect && (
              <p className="text-[10px] text-[var(--qt-amber)]">
                Connect ChatGPT in Leaderboard view to run verdicts.
              </p>
            )}
            {error && <p className="text-[10px] text-[var(--qt-red)]">{error}</p>}

            {verdict && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-[9px] uppercase tracking-wider">
                  <span className={`px-2 py-0.5 font-bold border rounded-[3px] ${verdictTone[verdict.verdict]}`}>
                    {verdict.verdict}
                  </span>
                  <span className="px-2 py-0.5 border border-[var(--qt-border-bright)] rounded-[3px] text-[var(--qt-dim)]">
                    {verdict.edgeType}
                  </span>
                  <span className="text-[var(--qt-faint)]">
                    conf: <span className="text-[var(--qt-dim)]">{verdict.confidence}</span>
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--qt-dim)] normal-case tracking-normal">
                  {verdict.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default WalletCardPanel;
