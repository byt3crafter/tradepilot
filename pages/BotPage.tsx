import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CTraderStatus {
  connected: boolean;
  configured: boolean;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
}

// ─── Section card wrapper ────────────────────────────────────────────────────

const BotCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
    <div className="px-5 py-4 border-b border-jtp-border">
      <h2 className="text-jtp-lg font-semibold text-jtp-text tracking-tight">{title}</h2>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

// ─── Status pill ─────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ label: string; color: 'neutral' | 'profit' | 'loss' }> = ({ label, color }) => {
  const colorMap = {
    neutral: 'bg-jtp-active text-jtp-textDim border-jtp-border',
    profit:  'bg-[rgba(74,193,128,0.12)] text-jtp-profit border-[rgba(74,193,128,0.2)]',
    loss:    'bg-[rgba(229,99,95,0.12)] text-jtp-loss border-[rgba(229,99,95,0.2)]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-jtp-xs font-medium border ${colorMap[color]}`}>
      {label}
    </span>
  );
};

// ─── Placeholder field row ────────────────────────────────────────────────────

const FieldRow: React.FC<{ label: string; placeholder: string }> = ({ label, placeholder }) => (
  <div className="flex items-center justify-between py-3 border-b border-jtp-borderSubtle last:border-b-0">
    <span className="text-jtp-sm text-jtp-textMuted">{label}</span>
    <span className="text-jtp-sm text-jtp-textDim font-mono">{placeholder}</span>
  </div>
);

// ─── Disabled toggle ─────────────────────────────────────────────────────────

const DisabledToggle: React.FC<{ labelOff: string; labelOn: string }> = ({ labelOff, labelOn }) => (
  <div className="flex items-center gap-3 opacity-50 cursor-not-allowed select-none">
    <span className="text-jtp-sm text-jtp-textDim">{labelOff}</span>
    <div
      className="relative w-9 h-5 rounded-full bg-jtp-active border border-jtp-border flex items-center"
      aria-disabled="true"
      role="switch"
      aria-checked={false}
    >
      <span className="absolute left-0.5 w-4 h-4 rounded-full bg-jtp-textDim transition-transform" />
    </div>
    <span className="text-jtp-sm text-jtp-textDim">{labelOn}</span>
  </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC = () => (
  <svg
    className="animate-spin w-4 h-4 text-jtp-textDim"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
  const isConfigured = status?.configured !== false; // treat null/undefined as configured

  // ─── Broker Connection card content ────────────────────────────────────────

  const renderBrokerContent = () => {
    if (loadingStatus) {
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-jtp-sm text-jtp-text font-medium">cTrader</p>
            <p className="text-jtp-xs text-jtp-textDim mt-0.5">Checking connection status…</p>
          </div>
          <Spinner />
        </div>
      );
    }

    if (!isConfigured) {
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-jtp-sm text-jtp-text font-medium">cTrader</p>
            <p className="text-jtp-xs text-jtp-textDim mt-0.5">cTrader not configured on this server</p>
          </div>
          <button
            disabled
            aria-disabled="true"
            className="flex items-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-sm font-medium bg-jtp-active border border-jtp-border text-jtp-textDim cursor-not-allowed opacity-50"
          >
            Connect cTrader
          </button>
        </div>
      );
    }

    if (isConnected) {
      const connectedDate = formatDate(status?.connectedAt);
      return (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Green indicator dot */}
            <span
              className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-jtp-profit"
              aria-hidden="true"
            />
            <div>
              <p className="text-jtp-sm text-jtp-text font-medium">Connected to cTrader</p>
              {connectedDate && (
                <p className="text-jtp-xs text-jtp-textDim mt-0.5">Since {connectedDate}</p>
              )}
              {status?.scope && (
                <p className="text-jtp-xs text-jtp-textDim mt-0.5 font-mono">{status.scope}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-sm font-medium bg-[rgba(229,99,95,0.1)] border border-[rgba(229,99,95,0.25)] text-jtp-loss hover:bg-[rgba(229,99,95,0.18)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disconnecting ? <Spinner /> : null}
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      );
    }

    // Not connected, configured
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-jtp-sm text-jtp-text font-medium">cTrader</p>
          <p className="text-jtp-xs text-jtp-textDim mt-0.5">
            Authorize JTradePilot to read and sync your trades
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-sm font-medium bg-jtp-blue text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? <Spinner /> : null}
          {connecting ? 'Redirecting…' : 'Connect cTrader'}
        </button>
      </div>
    );
  };

  return (
    <div className="p-5 md:p-6 space-y-5 animate-jtp-fade-in max-w-3xl">

      {/* Banner: success */}
      {banner === 'success' && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 bg-[rgba(74,193,128,0.08)] border border-[rgba(74,193,128,0.25)] rounded-jtp-panel px-4 py-3"
        >
          <p className="text-jtp-sm text-jtp-profit font-medium">
            cTrader connected — your trades will now sync automatically.
          </p>
          <button
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
            className="text-jtp-profit opacity-60 hover:opacity-100 transition-opacity text-jtp-lg leading-none"
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
          <p className="text-jtp-sm text-jtp-loss font-medium">
            Could not connect to cTrader — please try again.
          </p>
          <button
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
            className="text-jtp-loss opacity-60 hover:opacity-100 transition-opacity text-jtp-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Page header note */}
      <div className="flex items-start gap-3 bg-jtp-active border border-jtp-borderStrong rounded-jtp-panel px-4 py-3">
        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-jtp-blue text-white">
          BETA
        </span>
        <p className="text-jtp-sm text-jtp-textMuted leading-relaxed">
          Your AI trading bot — auto-sync + strategy automation. Currently in development.
        </p>
      </div>

      {/* Broker Connection */}
      <BotCard title="Broker Connection">
        {renderBrokerContent()}
      </BotCard>

      {/* Strategies */}
      <BotCard title="Strategies">
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-10 h-10 text-jtp-textDim mb-1"
          >
            <rect x="8" y="8" width="32" height="32" rx="4" />
            <path d="M16 28l6-8 6 6 6-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-jtp-sm text-jtp-textMuted font-medium">No strategies yet</p>
          <p className="text-jtp-xs text-jtp-textDim">
            {isConnected
              ? 'Strategy configuration coming soon.'
              : 'Strategy configuration will be available once the broker is connected.'}
          </p>
        </div>
      </BotCard>

      {/* Bot Status */}
      <BotCard title="Bot Status">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusPill label="Inactive" color="neutral" />
            <span className="text-jtp-sm text-jtp-textDim">
              {isConnected ? 'No strategy running' : 'Bot is not running'}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-jtp-xs text-jtp-textDim">Mode</span>
            <DisabledToggle labelOff="Paper" labelOn="Live" />
          </div>
        </div>
      </BotCard>

      {/* Risk Limits */}
      <BotCard title="Risk Limits">
        <p className="text-jtp-xs text-jtp-textDim mb-3">
          These limits will apply to all automated trades. Configuration will be enabled once connected.
        </p>
        <div className="divide-y divide-jtp-borderSubtle">
          <FieldRow label="Max risk per trade" placeholder="— %" />
          <FieldRow label="Max daily loss" placeholder="— %" />
          <FieldRow label="Max trades per day" placeholder="—" />
        </div>
      </BotCard>

    </div>
  );
};

export default BotPage;
