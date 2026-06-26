import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Panel, Badge, Button, EmptyState, Skeleton } from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CTraderStatus {
  connected: boolean;
  configured: boolean;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
}

// ─── Field row (risk limits) ──────────────────────────────────────────────────

const FieldRow: React.FC<{ label: string; placeholder: string }> = ({ label, placeholder }) => (
  <div className="flex items-center justify-between py-3 border-b border-jtp-borderSubtle last:border-b-0">
    <span className="text-jtp-md text-jtp-textMuted">{label}</span>
    <span className="text-jtp-md text-jtp-textDim font-mono">{placeholder}</span>
  </div>
);

// ─── Disabled paper/live toggle ───────────────────────────────────────────────

const DisabledToggle: React.FC<{ labelOff: string; labelOn: string }> = ({ labelOff, labelOn }) => (
  <div className="flex items-center gap-3 opacity-50 cursor-not-allowed select-none">
    <span className="text-jtp-md text-jtp-textDim">{labelOff}</span>
    <div
      className="relative w-9 h-5 rounded-full bg-jtp-active border border-jtp-border flex items-center"
      aria-disabled="true"
      role="switch"
      aria-checked={false}
    >
      <span className="absolute left-0.5 w-4 h-4 rounded-full bg-jtp-textDim transition-transform" />
    </div>
    <span className="text-jtp-md text-jtp-textDim">{labelOn}</span>
  </div>
);

// ─── Strategy empty icon ──────────────────────────────────────────────────────

const StrategyIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <rect x="8" y="8" width="32" height="32" rx="4" />
    <path d="M16 28l6-8 6 6 6-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Main BotPage ─────────────────────────────────────────────────────────────

const BotPage: React.FC = () => {
  const { getToken } = useAuth();

  const [status, setStatus] = useState<CTraderStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<'success' | 'error' | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.ctraderStatus(token!);
      setStatus(data);
    } catch {
      // silently fail — keep previous state
    } finally {
      setLoadingStatus(false);
    }
  }, [getToken]);

  // On mount: handle OAuth callback query params, then fetch status.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ctraderParam = params.get('ctrader');
    if (ctraderParam === 'connected') {
      setBanner('success');
      params.delete('ctrader');
      const newSearch = params.toString();
      history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
    } else if (ctraderParam === 'error') {
      setBanner('error');
      params.delete('ctrader');
      const newSearch = params.toString();
      history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
    }
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const token = await getToken();
      const { url } = await api.ctraderConnect(token!);
      window.location.href = url;
    } catch {
      setBanner('error');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const token = await getToken();
      await api.ctraderDisconnect(token!);
      await fetchStatus();
    } catch {
      // ignore, status refetch will reflect reality
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const isConnected = status?.connected === true;
  const isConfigured = status?.configured !== false;

  // ─── Broker Connection panel body ────────────────────────────────────────

  const renderBrokerContent = () => {
    if (loadingStatus) {
      return <Skeleton variant="text" lines={2} />;
    }

    if (!isConfigured) {
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-jtp-lg font-medium text-jtp-text">cTrader</p>
            <p className="text-jtp-md text-jtp-textDim mt-0.5">
              cTrader not configured on this server
            </p>
          </div>
          <Button variant="secondary" disabled aria-disabled="true">
            Connect cTrader
          </Button>
        </div>
      );
    }

    if (isConnected) {
      const connectedDate = formatDate(status?.connectedAt);
      return (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Live indicator dot */}
            <span
              className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-jtp-profit"
              aria-hidden="true"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-jtp-lg font-medium text-jtp-text">Connected to cTrader</p>
                <Badge variant="profit" size="xs">LIVE</Badge>
              </div>
              {connectedDate && (
                <p className="text-jtp-md text-jtp-textDim mt-0.5">Since {connectedDate}</p>
              )}
              {status?.scope && (
                <p className="text-jtp-md text-jtp-textDim mt-0.5 font-mono">{status.scope}</p>
              )}
            </div>
          </div>
          <Button variant="danger" onClick={handleDisconnect} isLoading={disconnecting}>
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
      );
    }

    // Not connected, configured
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-jtp-lg font-medium text-jtp-text">cTrader</p>
          <p className="text-jtp-md text-jtp-textDim mt-0.5">
            Authorize JTradePilot to read and sync your trades
          </p>
        </div>
        <Button variant="primary" onClick={handleConnect} isLoading={connecting}>
          {connecting ? 'Redirecting…' : 'Connect cTrader'}
        </Button>
      </div>
    );
  };

  return (
    <div className="px-5 py-[18px] pb-10 space-y-4 animate-jtp-fade-in max-w-3xl">

      {/* Banner: success */}
      {banner === 'success' && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 bg-[rgba(74,193,128,0.08)] border border-[rgba(74,193,128,0.25)] rounded-jtp-panel px-4 py-3"
        >
          <p className="text-jtp-lg text-jtp-profit font-medium">
            cTrader connected — your trades will now sync automatically.
          </p>
          <button
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
            className="text-jtp-profit opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Banner: error */}
      {banner === 'error' && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-[rgba(229,99,95,0.08)] border border-[rgba(229,99,95,0.25)] rounded-jtp-panel px-4 py-3"
        >
          <p className="text-jtp-lg text-jtp-loss font-medium">
            Could not connect to cTrader — please try again.
          </p>
          <button
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
            className="text-jtp-loss opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Page header note */}
      <div className="flex items-start gap-3 bg-jtp-active border border-jtp-borderStrong rounded-jtp-panel px-4 py-3">
        <Badge variant="info" size="md">BETA</Badge>
        <p className="text-jtp-md text-jtp-textMuted leading-relaxed">
          Your AI trading bot — auto-sync + strategy automation. Currently in development.
        </p>
      </div>

      {/* Broker Connection */}
      <Panel label="BROKER CONNECTION">
        {renderBrokerContent()}
      </Panel>

      {/* Strategies */}
      <Panel label="STRATEGIES">
        <EmptyState
          icon={<StrategyIcon />}
          title="No strategies yet"
          description={
            isConnected
              ? 'Strategy configuration coming soon.'
              : 'Available once a broker account is connected.'
          }
        />
      </Panel>

      {/* Bot Status */}
      <Panel label="BOT STATUS">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="neutral">Inactive</Badge>
            <span className="text-jtp-md text-jtp-textDim">
              {isConnected ? 'No strategy running' : 'Bot is not running'}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="jtp-label">Mode</span>
            <DisabledToggle labelOff="Paper" labelOn="Live" />
          </div>
        </div>
      </Panel>

      {/* Risk Limits */}
      <Panel label="RISK LIMITS">
        <p className="text-jtp-md text-jtp-textDim mb-3">
          These limits will apply to all automated trades. Configuration will be enabled once connected.
        </p>
        <div className="divide-y divide-jtp-borderSubtle">
          <FieldRow label="Max risk per trade" placeholder="— %" />
          <FieldRow label="Max daily loss" placeholder="— %" />
          <FieldRow label="Max trades per day" placeholder="—" />
        </div>
      </Panel>

    </div>
  );
};

export default BotPage;
