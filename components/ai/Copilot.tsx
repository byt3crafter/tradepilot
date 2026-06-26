import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import api from '../../services/api';
import type { AiAgentStep } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

type CopilotMode = 'agent' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  // Agent-mode metadata (assistant messages only)
  steps?: AiAgentStep[];
  actions?: string[];
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const SparkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
    <path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" opacity="0.7" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
    <path d="M2.5 10L17 3.5 12.5 17l-3-5.5L2.5 10z" />
  </svg>
);

const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Helper: compactly render a tool call's args ─────────────────────────────

function formatArgs(args?: Record<string, unknown>): string {
  if (!args || typeof args !== 'object') return '';
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  return entries
    .map(([k, v]) => {
      let val: string;
      if (v === null || v === undefined) val = '∅';
      else if (typeof v === 'object') val = Array.isArray(v) ? `[${v.length}]` : '{…}';
      else val = String(v);
      if (val.length > 40) val = val.slice(0, 37) + '…';
      return `${k}: ${val}`;
    })
    .join(', ');
}

// ─── Agent metadata block (collapsible "used N tools" + next steps) ──────────

const AgentMeta: React.FC<{ steps?: AiAgentStep[]; actions?: string[] }> = ({ steps, actions }) => {
  const [showTools, setShowTools] = useState(false);
  const hasSteps = !!steps && steps.length > 0;
  const hasActions = !!actions && actions.length > 0;
  if (!hasSteps && !hasActions) return null;

  return (
    <div className="mt-2 space-y-2">
      {hasSteps && (
        <div>
          <button
            onClick={() => setShowTools(s => !s)}
            className="inline-flex items-center gap-1 text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors"
            aria-expanded={showTools}
          >
            <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${showTools ? '' : '-rotate-90'}`} />
            <span>🔧 used {steps!.length} tool{steps!.length === 1 ? '' : 's'}</span>
          </button>
          {showTools && (
            <ol className="mt-1.5 ml-1 space-y-1">
              {steps!.map((s, i) => {
                const argStr = formatArgs(s.args);
                return (
                  <li key={i} className="text-jtp-xs text-jtp-textMuted leading-snug">
                    <span className="text-jtp-textDim">{i + 1}.</span>{' '}
                    <code className="text-jtp-blue">{s.tool}</code>
                    {argStr && <span className="text-jtp-textFaint"> ({argStr})</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
      {hasActions && (
        <div className="rounded-jtp-xl border border-jtp-borderSubtle bg-jtp-shell px-2.5 py-2">
          <div className="text-jtp-xs font-semibold text-jtp-textDim mb-1">Next steps</div>
          <ul className="list-disc list-inside space-y-0.5">
            {actions!.map((a, i) => (
              <li key={i} className="text-jtp-xs text-jtp-textMuted leading-snug">{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Helper: build a compact recent-history string ───────────────────────────

function buildHistory(messages: ChatMessage[]): string {
  // Send the recent conversation as plain text so the backend can ground replies.
  return messages
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
}

const NOT_CONNECTED_HINT =
  'Connect ChatGPT/Codex in Settings → AI to use the copilot.';

// ─── Component ────────────────────────────────────────────────────────────────

const Copilot: React.FC = () => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CopilotMode>('agent');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [needsConnect, setNeedsConnect] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    if (open) {
      // Defer focus so the panel is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = buildHistory(messages);

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setNeedsConnect(false);
    setSending(true);

    try {
      const token = await getToken();
      if (mode === 'agent') {
        const res = await api.aiAgent(text, token!);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: res.answer || 'Done.',
            steps: res.steps,
            actions: res.actions,
          },
        ]);
      } else {
        const { reply } = await api.aiChat(text, history, token!);
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (err: any) {
      const msg: string = err?.message || 'Something went wrong.';
      // Backend signals a missing/permission-blocked connection by mentioning Settings → AI.
      if (/settings\s*→?\s*ai/i.test(msg) || /connect/i.test(msg)) {
        setNeedsConnect(true);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: NOT_CONNECTED_HINT },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Sorry — ${msg}` },
        ]);
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, getToken, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const goToSettings = () => {
    setOpen(false);
    navigateTo('settings', 'ai');
  };

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Copilot"
          className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-jtp-blue hover:bg-jtp-blueHover text-white flex items-center justify-center shadow-jtp-drawer transition-colors"
        >
          <SparkIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-2.5rem)] flex flex-col bg-jtp-panel border border-jtp-border rounded-jtp-panel shadow-jtp-drawer overflow-hidden animate-fade-in-up"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-jtp-border bg-jtp-shell flex-shrink-0">
            <span className="w-7 h-7 rounded-full bg-[rgba(91,141,239,0.14)] text-jtp-blue flex items-center justify-center">
              <SparkIcon className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-jtp-base font-semibold text-jtp-text leading-tight">
                AI Copilot
              </div>
              <div className="text-jtp-xs text-jtp-textDim leading-tight">
                Grounded in your trading data
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close copilot"
              className="p-1 rounded-jtp-xl text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="px-4 py-2.5 border-b border-jtp-border bg-jtp-shell flex-shrink-0">
            <div
              role="tablist"
              aria-label="Copilot mode"
              className="flex items-center gap-1 p-0.5 rounded-jtp-xl bg-jtp-panel border border-jtp-border"
            >
              {(['agent', 'chat'] as CopilotMode[]).map(m => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  disabled={sending}
                  className={[
                    'flex-1 text-jtp-xs font-semibold py-1.5 rounded-jtp-lg transition-colors capitalize disabled:cursor-not-allowed',
                    mode === m
                      ? 'bg-jtp-blue text-white'
                      : 'text-jtp-textMuted hover:text-jtp-text',
                  ].join(' ')}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="text-jtp-xs text-jtp-textFaint mt-1.5 text-center">
              Agent researches with read-only tools before answering.
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                <span className="w-10 h-10 rounded-full bg-[rgba(91,141,239,0.12)] text-jtp-blue flex items-center justify-center">
                  <SparkIcon className="w-5 h-5" />
                </span>
                <div className="text-jtp-sm text-jtp-textMuted">
                  {mode === 'agent'
                    ? 'Give the agent a goal — it researches, then answers.'
                    : 'Ask about your trades, edge, or risk.'}
                </div>
                <div className="text-jtp-xs text-jtp-textFaint">
                  e.g. “Where am I losing the most R?”
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[82%] px-3 py-2 rounded-jtp-xl text-jtp-sm break-words',
                    m.role === 'user'
                      ? 'bg-jtp-blue text-white'
                      : 'bg-jtp-active border border-jtp-borderSubtle text-jtp-text',
                  ].join(' ')}
                >
                  <span className="whitespace-pre-wrap">{m.content}</span>
                  {m.role === 'assistant' && (
                    <AgentMeta steps={m.steps} actions={m.actions} />
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-jtp-active border border-jtp-borderSubtle rounded-jtp-xl px-3 py-2 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-jtp-textDim animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-jtp-textDim animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-jtp-textDim animate-pulse [animation-delay:300ms]" />
                  </span>
                  {mode === 'agent' && (
                    <span className="text-jtp-xs text-jtp-textDim">researching…</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Connect prompt */}
          {needsConnect && (
            <div className="px-4 pb-2 flex-shrink-0">
              <button
                onClick={goToSettings}
                className="w-full text-jtp-sm font-medium px-3 py-2 rounded-jtp-xl bg-[rgba(91,141,239,0.12)] text-jtp-blue hover:bg-[rgba(91,141,239,0.2)] transition-colors"
              >
                Open Settings → AI
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-jtp-border bg-jtp-shell px-3 py-3 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={mode === 'agent' ? 'Give the agent a goal…' : 'Ask your copilot…'}
                className="flex-1 resize-none max-h-28 bg-jtp-panel border border-jtp-border rounded-jtp-xl px-3 py-2 text-jtp-sm text-jtp-text placeholder:text-jtp-textFaint focus:outline-none focus:border-jtp-blue"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                aria-label="Send message"
                className="w-9 h-9 flex-shrink-0 rounded-jtp-xl bg-jtp-blue hover:bg-jtp-blueHover disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="text-jtp-xs text-jtp-textFaint mt-2 text-center">
              AI copilot — not financial advice.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Copilot;
