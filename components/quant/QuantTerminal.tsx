import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { PmWallet, QuantFeedItem } from '../../types';
import './quant-terminal.css';

import TickerTape from './TickerTape';
import HeaderStrip from './HeaderStrip';
import EdgeLeaderboardPanel from './EdgeLeaderboardPanel';
import WalletCardPanel from './WalletCardPanel';
import CandlePanel from './CandlePanel';
import HeatmapPanel from './HeatmapPanel';
import StatusFooter from './StatusFooter';
import { useInterval } from './primitives';

const DAY = 86400 * 1000;

const QuantTerminal: React.FC = () => {
  const { getToken } = useAuth();

  const [feed, setFeed] = useState<QuantFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedOk, setFeedOk] = useState(true);

  const [leaderboard, setLeaderboard] = useState<PmWallet[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; scanned: number; qualified: number } | null>(null);

  const [selected, setSelected] = useState<PmWallet | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ── Live feed (ticker tape) — refresh ~10s ──
  const loadFeed = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.quantFeed(40, token);
      setFeed(Array.isArray(data) ? data : []);
      setFeedOk(true);
    } catch {
      setFeedOk(false);
    } finally {
      setFeedLoading(false);
    }
  }, [getToken]);

  // ── Leaderboard + stats — refresh ~30s ──
  const loadBoard = useCallback(async () => {
    try {
      const token = await getToken();
      const [board, s] = await Promise.all([api.quantLeaderboard(20, token), api.quantStats(token)]);
      setLeaderboard(board);
      setStats(s);
      setSelected((prev) => prev ?? board[0] ?? null);
      setLastUpdate(new Date());
    } catch {
      // keep prior state; panels show their own empty states
    } finally {
      setBoardLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadFeed();
    loadBoard();
  }, [loadFeed, loadBoard]);

  useInterval(loadFeed, 10000);
  useInterval(loadBoard, 30000);

  return (
    <div className="qt-root animate-jtp-fade-in -mx-1 space-y-2 text-[var(--qt-text)]">
      {/* 1 — ticker tape */}
      <TickerTape feed={feed} loading={feedLoading} />

      {/* 2 — header strip */}
      <HeaderStrip stats={stats} />

      {/* main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-start">
        {/* 3 — edge leaderboard (spans 1, tall) */}
        <div className="lg:col-span-1">
          <EdgeLeaderboardPanel
            wallets={leaderboard}
            loading={boardLoading}
            selected={selected?.address}
            onSelect={setSelected}
          />
        </div>

        {/* 4 — wallet card */}
        <div className="lg:col-span-1">
          <WalletCardPanel wallet={selected} />
        </div>

        {/* 5 + 6 — candles + heatmap stacked */}
        <div className="lg:col-span-1 space-y-2">
          <CandlePanel symbol="BTCUSD" interval="15min" lookbackMs={5 * DAY} height={190} />
          <CandlePanel symbol="ETHUSD" interval="15min" lookbackMs={5 * DAY} height={120} />
          <HeatmapPanel />
        </div>
      </div>

      {/* 7 — status footer */}
      <StatusFooter online={feedOk} lastUpdate={lastUpdate} walletCount={stats?.total ?? leaderboard.length} />
    </div>
  );
};

export default QuantTerminal;
