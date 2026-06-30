/**
 * QuantCopilot — AI chat panel grounded in the user's real bot data.
 *
 * Communicates with POST /api/autobot/copilot { question } → { answer }.
 * One request per question; no streaming. Plain-text answers, line-breaks rendered.
 * Follows the Pro Terminal design system (jtp tokens, amber accent, dark panels).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant';

interface Message {
  id: number;
  role: Role;
  text: string;
}

// ─── Suggested questions ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Why is my P&L where it is?",
  "Which strategy is working best?",
  "What does the bot like (What Works)?",
  "When do my open bets settle?",
  "What did it buy most recently and why?",
] as const;

// ─── Small helpers ────────────────────────────────────────────────────────────

const Spin: React.FC = () => (
  <svg
    className="animate-spin w-3.5 h-3.5 text-jtp-textDim inline flex-shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

/** Render plain text with newline → <br> support */
const PlainText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('\n').map((line, i, arr) => (
      <React.Fragment key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    ))}
  </>
);

// ─── Component ────────────────────────────────────────────────────────────────

let _msgId = 0;
const nextId = () => ++_msgId;

const QuantCopilot: React.FC = () => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever messages change or thinking indicator appears
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, thinking]);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || thinking) return;

      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: q },
      ]);
      setInput('');
      setThinking(true);

      try {
        const token = await getToken();
        const { answer } = await api.autobotCopilot(q, token);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', text: answer },
        ]);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Something went wrong. Please try again.';
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', text: msg },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [thinking, getToken],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleSuggestion = (s: string) => {
    setInput(s);
    // Immediately send — same UX as clicking "fill + send"
    send(s);
  };

  const isEmpty = messages.length === 0 && !thinking;

  return (
    <div
      className="flex flex-col bg-jtp-panel border border-jtp-border rounded-[2px] overflow-hidden"
      style={{ minHeight: '420px', maxHeight: '640px' }}
    >
      {/* ── Panel header ── */}
      <header
        className="flex-shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-[9px] border-b border-jtp-border"
        style={{ borderTop: '2px solid rgba(232,162,61,0.55)' }}
      >
        <div>
          <span className="jtp-label tracking-[0.12em] select-none">
            <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>
            AI COPILOT
          </span>
          <p className="font-mono text-jtp-2xs text-jtp-textFaint mt-0.5">
            Grounded in your bot&apos;s real data.
          </p>
        </div>
      </header>

      {/* ── Message list ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        role="log"
        aria-label="Copilot conversation"
        aria-live="polite"
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="font-mono text-jtp-xs text-jtp-textFaint text-center leading-relaxed max-w-xs">
              Ask me anything about your bot — I read your real trades, positions, and the brain&apos;s decisions.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  /* User bubble — amber, right-aligned */
                  <div
                    className="max-w-[80%] px-3 py-2 rounded-[2px] font-mono text-jtp-xs leading-relaxed"
                    style={{
                      background: 'rgba(232,162,61,0.14)',
                      border: '1px solid rgba(232,162,61,0.40)',
                      color: '#e8a23d',
                    }}
                  >
                    <PlainText text={msg.text} />
                  </div>
                ) : (
                  /* Assistant bubble — dark, left-aligned */
                  <div
                    className="max-w-[88%] px-3 py-2 rounded-[2px] font-mono text-jtp-xs leading-relaxed text-jtp-textMuted"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <PlainText text={msg.text} />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-[2px] font-mono text-jtp-xs text-jtp-textFaint"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  aria-label="Copilot is thinking"
                >
                  <Spin />
                  <span>thinking…</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Suggested questions ── */}
      {isEmpty && (
        <div
          className="flex-shrink-0 px-4 pb-2 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Suggested questions"
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestion(s)}
              disabled={thinking}
              className="font-mono text-jtp-2xs px-2.5 py-1 rounded-[2px] border border-jtp-borderStrong text-jtp-textMuted hover:text-jtp-amber hover:border-jtp-borderFocus transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div className="flex-shrink-0 border-t border-jtp-border p-3 space-y-2">
        {/* Suggestions below the first exchange — compact strip */}
        {!isEmpty && (
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Suggested questions"
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestion(s)}
                disabled={thinking}
                className="font-mono text-jtp-2xs px-2 py-0.5 rounded-[2px] border border-jtp-borderSubtle text-jtp-textFaint hover:text-jtp-amber hover:border-jtp-borderFocus transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your bot… e.g. why did it buy X? how's Copy doing?"
            disabled={thinking}
            rows={2}
            aria-label="Ask the AI Copilot"
            className="flex-1 min-w-0 resize-none bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-3 py-2 font-mono text-jtp-xs text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors disabled:opacity-50"
            style={{ lineHeight: '1.5' }}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={thinking || !input.trim()}
            aria-label="Send question"
            className="flex-shrink-0 font-mono text-jtp-xs font-bold uppercase tracking-wider px-3 py-2 rounded-[2px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: thinking || !input.trim()
                ? 'rgba(232,162,61,0.07)'
                : 'rgba(232,162,61,0.18)',
              border: '1px solid rgba(232,162,61,0.45)',
              color: '#e8a23d',
            }}
          >
            {thinking ? <Spin /> : 'Send'}
          </button>
        </div>

        {/* Footer disclaimer */}
        <p className="font-mono text-jtp-2xs text-jtp-textFaint">
          Read-only &bull; informational, not financial advice.
        </p>
      </div>
    </div>
  );
};

export default QuantCopilot;
