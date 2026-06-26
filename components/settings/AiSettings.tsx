import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { ChatGptPermissions, ChatGptStatus } from '../../services/api';
import Card from '../Card';

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin text-jtp-textDim ${className ?? 'w-4 h-4'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── Permission toggle switch ───────────────────────────────────────────────────

const PermissionToggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void;
}> = ({ label, description, enabled, busy, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-jtp-border last:border-b-0">
    <div className="min-w-0">
      <p className="text-jtp-md font-medium text-jtp-text">{label}</p>
      <p className="text-jtp-sm text-jtp-textDim mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex flex-shrink-0 h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-jtp-borderFocus ${
        enabled ? 'bg-jtp-profit' : 'bg-jtp-control border border-jtp-borderStrong'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// ─── AI Settings panel ──────────────────────────────────────────────────────────

const AiSettings: React.FC = () => {
  const { getToken } = useAuth();

  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<ChatGptStatus>({ connected: false });

  const [starting, setStarting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const [savingPerm, setSavingPerm] = useState<keyof ChatGptPermissions | null>(null);
  const [permError, setPermError] = useState<string | null>(null);

  const connected = !!status.connected;
  const permissions: ChatGptPermissions = status.permissions ?? { verdict: false, bot: false, analysis: false };

  const refreshStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const s = await api.chatgptStatus(token);
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    } finally {
      setStatusLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleStart = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const token = await getToken();
      const { authUrl } = await api.chatgptStart(token);
      if (typeof window !== 'undefined') window.open(authUrl, '_blank', 'noopener,noreferrer');
      setShowPaste(true);
    } catch (e: any) {
      setError(e?.message || 'Could not start the ChatGPT connection. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [getToken]);

  const handleExchange = useCallback(async () => {
    setError(null);
    let code: string | null = null;
    let state: string | null = null;
    try {
      const url = new URL(pasted.trim());
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
    } catch {
      setError('That does not look like a valid URL. Paste the full address (including https://).');
      return;
    }
    if (!code || !state) {
      setError('Could not find a code in that URL. Make sure you copied the entire redirect address.');
      return;
    }
    setExchanging(true);
    try {
      const token = await getToken();
      await api.chatgptExchange(code, state, token);
      setJustConnected(true);
      setShowPaste(false);
      setPasted('');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Could not complete the connection. Please try again.');
    } finally {
      setExchanging(false);
    }
  }, [pasted, getToken, refreshStatus]);

  const handleDisconnect = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      await api.chatgptDisconnect(token);
      setJustConnected(false);
      setShowPaste(false);
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Could not disconnect. Please try again.');
    }
  }, [getToken, refreshStatus]);

  const togglePermission = useCallback(
    async (key: keyof ChatGptPermissions, next: boolean) => {
      setPermError(null);
      setSavingPerm(key);
      // optimistic update
      setStatus((prev) => ({
        ...prev,
        permissions: { ...(prev.permissions ?? { verdict: false, bot: false, analysis: false }), [key]: next },
      }));
      try {
        const token = await getToken();
        const updated = await api.chatgptSetPermissions({ [key]: next }, token);
        setStatus(updated);
      } catch (e: any) {
        setPermError(e?.message || 'Could not update that permission. Please try again.');
        // revert by refetching
        await refreshStatus();
      } finally {
        setSavingPerm(null);
      }
    },
    [getToken, refreshStatus],
  );

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-jtp-xl font-semibold text-jtp-text mb-1">ChatGPT / Codex</h2>
        <p className="text-jtp-md text-jtp-textDim mb-6">
          Connect your ChatGPT/Codex account once — it powers AI across JTradePilot. Requires
          ChatGPT Plus/Pro.
        </p>

        {/* ── Connection ── */}
        <div className="bg-jtp-raised border border-jtp-border rounded-jtp-lg p-5 space-y-3">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-jtp-textDim">
              <Spinner />
              <span className="text-jtp-sm">Checking connection…</span>
            </div>
          ) : connected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-jtp-sm font-medium bg-[rgba(34,197,94,0.12)] text-jtp-profit border border-[rgba(34,197,94,0.25)]">
                  Connected ✓
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-jtp-sm text-jtp-blue hover:underline font-medium"
                >
                  Disconnect
                </button>
              </div>
              <p className="text-jtp-xs text-jtp-textMuted">
                {status.connectedAt
                  ? `Connected ${new Date(status.connectedAt).toLocaleString()}.`
                  : 'Your ChatGPT/Codex account is linked.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {!showPaste ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={starting}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {starting ? <Spinner /> : null}
                  {starting ? 'Opening…' : 'Connect ChatGPT / Codex'}
                </button>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-jtp-xs text-jtp-textMuted leading-relaxed">
                    After signing in, OpenAI redirects to a page that won't load (localhost:1455).
                    Copy that full URL from the address bar and paste it below.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={pasted}
                      onChange={(e) => setPasted(e.target.value)}
                      placeholder="http://localhost:1455/?code=…&state=…"
                      spellCheck={false}
                      autoComplete="off"
                      className="flex-1 bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text placeholder:text-jtp-textDim placeholder:font-sans focus:outline-none focus:border-jtp-borderFocus transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleExchange}
                      disabled={exchanging || !pasted.trim()}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {exchanging ? <Spinner /> : null}
                      {exchanging ? 'Connecting…' : 'Complete Connection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {justConnected && connected && (
            <p className="text-jtp-sm text-jtp-profit font-medium">ChatGPT / Codex connected ✓</p>
          )}

          {error && (
            <p role="alert" className="text-jtp-xs text-jtp-loss">
              {error}
            </p>
          )}

          <p className="text-jtp-xs text-jtp-textDim">
            Uses your own ChatGPT/Codex account. Requires ChatGPT Plus/Pro.
          </p>
        </div>
      </Card>

      {/* ── Permissions ── */}
      {connected && (
        <Card>
          <h2 className="text-jtp-xl font-semibold text-jtp-text mb-1">What AI can power</h2>
          <p className="text-jtp-md text-jtp-textDim mb-4">
            Control which JTradePilot features use your connected ChatGPT/Codex account. A disabled
            feature won't use AI.
          </p>

          {permError && (
            <p role="alert" className="text-jtp-xs text-jtp-loss mb-2">
              {permError}
            </p>
          )}

          <div className="bg-jtp-raised border border-jtp-border rounded-jtp-lg px-5">
            <PermissionToggle
              label="AI Verdict (Quant)"
              description="Generate copyable-edge verdicts on Polymarket wallets in the Quant page."
              enabled={permissions.verdict}
              busy={savingPerm === 'verdict'}
              onChange={(next) => togglePermission('verdict', next)}
            />
            <PermissionToggle
              label="Bot strategy AI"
              description="Let the trading bot use AI to shape and refine its strategy."
              enabled={permissions.bot}
              busy={savingPerm === 'bot'}
              onChange={(next) => togglePermission('bot', next)}
            />
            <PermissionToggle
              label="Trade & journal analysis"
              description="AI summaries, mistakes and good points on your trades and journal entries."
              enabled={permissions.analysis}
              busy={savingPerm === 'analysis'}
              onChange={(next) => togglePermission('analysis', next)}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default AiSettings;
