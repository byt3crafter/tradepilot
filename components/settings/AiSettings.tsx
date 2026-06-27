import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { ChatGptPermissions, ChatGptStatus } from '../../services/api';
import { Panel, Badge, ToggleSwitch, Button, Input } from '../ui';
import AgentPanel from '../ai/AgentPanel';

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

// ─── AI Settings ──────────────────────────────────────────────────────────────

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

  // ── Model picker ──
  const [modelInput, setModelInput] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const FALLBACK_MODELS = ['gpt-5.3-codex', 'gpt-5.1-codex', 'gpt-5-codex', 'o4-mini', 'gpt-5.4'];

  const connected = !!status.connected;
  const permissions: ChatGptPermissions = status.permissions ?? { verdict: false, bot: false, analysis: false };

  const refreshStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const s = await api.chatgptStatus(token);
      setStatus(s);
      setModelInput(s.model ?? '');
    } catch {
      setStatus({ connected: false });
    } finally {
      setStatusLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!connected) {
      setModelOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      try {
        const token = await getToken();
        const { models } = await api.chatgptModels(token);
        if (!cancelled) setModelOptions(Array.isArray(models) ? models : []);
      } catch {
        if (!cancelled) setModelOptions([]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, getToken]);

  const suggestions = modelOptions.length > 0 ? modelOptions : FALLBACK_MODELS;

  const handleSaveModel = useCallback(async () => {
    const value = modelInput.trim();
    if (!value) {
      setModelError('Enter a model name first.');
      return;
    }
    setModelError(null);
    setModelSaved(false);
    setSavingModel(true);
    try {
      const token = await getToken();
      const updated = await api.chatgptSetModel(value, token);
      setStatus(updated);
      setModelInput(updated.model ?? value);
      setModelSaved(true);
    } catch (e: any) {
      setModelError(e?.message || 'Could not save the model. Please try again.');
    } finally {
      setSavingModel(false);
    }
  }, [modelInput, getToken]);

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
        await refreshStatus();
      } finally {
        setSavingPerm(null);
      }
    },
    [getToken, refreshStatus],
  );

  return (
    <div className="space-y-4">
      {/* ── ChatGPT / Codex connection ── */}
      <Panel label="CHATGPT / CODEX">
        <p className="text-jtp-md text-jtp-textMuted mb-4">
          Connect your ChatGPT/Codex account once — it powers AI across JTradePilot. Requires
          ChatGPT Plus/Pro.
        </p>

        <div className="bg-jtp-raised border border-jtp-border rounded-[2px] p-4 space-y-3">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-jtp-textMuted">
              <Spinner />
              <span className="text-jtp-md">Checking connection…</span>
            </div>
          ) : connected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Badge variant="profit" size="md">CONNECTED</Badge>
                <Button variant="link" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
              <p className="text-jtp-md text-jtp-textMuted">
                {status.connectedAt
                  ? `Connected ${new Date(status.connectedAt).toLocaleString()}.`
                  : 'Your ChatGPT/Codex account is linked.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {!showPaste ? (
                <Button
                  onClick={handleStart}
                  isLoading={starting}
                  disabled={starting}
                >
                  {starting ? 'Opening…' : 'Connect ChatGPT / Codex'}
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-jtp-md text-jtp-textMuted leading-relaxed">
                    After signing in, OpenAI redirects to a page that won't load (localhost:1455).
                    Copy that full URL from the address bar and paste it below.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5 items-end">
                    <Input
                      id="paste-url"
                      type="text"
                      value={pasted}
                      onChange={(e) => setPasted(e.target.value)}
                      placeholder="http://localhost:1455/?code=…&state=…"
                      spellCheck={false}
                      autoComplete="off"
                      containerClassName="flex-1 mb-0"
                    />
                    <Button
                      onClick={handleExchange}
                      disabled={exchanging || !pasted.trim()}
                      isLoading={exchanging}
                    >
                      {exchanging ? 'Connecting…' : 'Complete Connection'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {justConnected && connected && (
            <p className="text-jtp-md text-jtp-profit font-medium">ChatGPT / Codex connected</p>
          )}

          {error && (
            <p role="alert" className="text-jtp-md text-jtp-loss">{error}</p>
          )}

          <p className="text-jtp-md text-jtp-textMuted">
            Uses your own ChatGPT/Codex account. Requires ChatGPT Plus/Pro.
          </p>
        </div>
      </Panel>

      {/* ── Model picker ── */}
      {connected && (
        <Panel label="MODEL">
          <p className="text-jtp-md text-jtp-textMuted mb-4">
            Which ChatGPT/Codex model to use. If you're unsure, use the same model name your Codex
            CLI uses (e.g.{' '}
            <span className="font-mono text-jtp-text">gpt-5.3-codex</span>
            ). Our guesses failed for your account, so set it explicitly.
          </p>

          <div className="bg-jtp-raised border border-jtp-border rounded-[2px] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-end">
              <div className="flex-1">
                <Input
                  id="model-name"
                  type="text"
                  list="chatgpt-model-options"
                  value={modelInput}
                  onChange={(e) => {
                    setModelInput(e.target.value);
                    setModelSaved(false);
                    setModelError(null);
                  }}
                  placeholder={status.model ?? 'e.g. gpt-5.3-codex'}
                  spellCheck={false}
                  autoComplete="off"
                  containerClassName="mb-0"
                />
                <datalist id="chatgpt-model-options">
                  {suggestions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <Button
                onClick={handleSaveModel}
                disabled={savingModel || !modelInput.trim()}
                isLoading={savingModel}
              >
                {savingModel ? 'Saving…' : 'Save'}
              </Button>
            </div>

            {/* Clickable suggestions */}
            <div className="flex items-center gap-2 flex-wrap">
              {modelsLoading ? (
                <span className="inline-flex items-center gap-1.5 text-jtp-md text-jtp-textMuted">
                  <Spinner className="w-3.5 h-3.5" />
                  Loading your models…
                </span>
              ) : (
                <>
                  <span className="text-jtp-md text-jtp-textMuted">
                    {modelOptions.length > 0 ? 'Available:' : 'Suggestions:'}
                  </span>
                  {suggestions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModelInput(m);
                        setModelSaved(false);
                        setModelError(null);
                      }}
                      className={`px-2.5 py-1 rounded-[2px] text-jtp-xs font-mono border transition-colors ${
                        modelInput.trim() === m
                          ? 'bg-jtp-blue text-[#08090b] border-jtp-blue'
                          : 'bg-jtp-control text-jtp-text border-jtp-borderStrong hover:border-jtp-borderFocus'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </>
              )}
            </div>

            {modelSaved && (
              <p className="text-jtp-md text-jtp-profit">Model saved ✓</p>
            )}
            {modelError && (
              <p role="alert" className="text-jtp-md text-jtp-loss">{modelError}</p>
            )}

            <p className="text-jtp-md text-jtp-textMuted">
              After saving, re-run an AI Verdict in Quant to test it. If it errors with "model not
              supported", try another.
            </p>
          </div>
        </Panel>
      )}

      {/* ── Permissions ── */}
      {connected && (
        <Panel label="PERMISSIONS">
          <p className="text-jtp-md text-jtp-textMuted mb-4">
            Control which JTradePilot features use your connected ChatGPT/Codex account. A disabled
            feature won't use AI.
          </p>

          {permError && (
            <p role="alert" className="text-jtp-md text-jtp-loss mb-2">{permError}</p>
          )}

          <div className="bg-jtp-raised border border-jtp-border rounded-[2px] divide-y divide-jtp-border">
            <div className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="text-jtp-md font-medium text-jtp-text">AI Verdict (Quant)</p>
                <p className="text-jtp-md text-jtp-textMuted mt-0.5">
                  Generate copyable-edge verdicts on Polymarket wallets in the Quant page.
                </p>
              </div>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  label=""
                  checked={permissions.verdict}
                  onChange={(next) => togglePermission('verdict', next)}
                  disabled={savingPerm === 'verdict'}
                />
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="text-jtp-md font-medium text-jtp-text">Bot strategy AI</p>
                <p className="text-jtp-md text-jtp-textMuted mt-0.5">
                  Let the trading bot use AI to shape and refine its strategy.
                </p>
              </div>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  label=""
                  checked={permissions.bot}
                  onChange={(next) => togglePermission('bot', next)}
                  disabled={savingPerm === 'bot'}
                />
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="text-jtp-md font-medium text-jtp-text">Trade &amp; journal analysis</p>
                <p className="text-jtp-md text-jtp-textMuted mt-0.5">
                  AI summaries, mistakes and good points on your trades and journal entries.
                </p>
              </div>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  label=""
                  checked={permissions.analysis}
                  onChange={(next) => togglePermission('analysis', next)}
                  disabled={savingPerm === 'analysis'}
                />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* ── Agent management: tools/skills + run audit log ── */}
      <AgentPanel />
    </div>
  );
};

export default AiSettings;
