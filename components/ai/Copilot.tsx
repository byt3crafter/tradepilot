import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import api from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
      const { reply } = await api.aiChat(text, history, token!);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
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
  }, [input, sending, messages, getToken]);

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
                  Ask about your trades, edge, or risk.
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
                    'max-w-[82%] px-3 py-2 rounded-jtp-xl text-jtp-sm whitespace-pre-wrap break-words',
                    m.role === 'user'
                      ? 'bg-jtp-blue text-white'
                      : 'bg-jtp-active border border-jtp-borderSubtle text-jtp-text',
                  ].join(' ')}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-jtp-active border border-jtp-borderSubtle rounded-jtp-xl px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-jtp-textDim animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-jtp-textDim animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-jtp-textDim animate-pulse [animation-delay:300ms]" />
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
                placeholder="Ask your copilot…"
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
