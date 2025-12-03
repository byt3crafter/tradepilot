import React, { useState } from 'react';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { SparklesIcon } from '../icons/SparklesIcon';

interface LogWithAIProps {
  onParsedData: (data: any) => void;
  isLoading: boolean;
  onParseText: (text: string) => Promise<void>;
  error: string | null;
  onQuickSubmit?: () => void;
  canQuickSubmit?: boolean;
  isSubmitting?: boolean;
}

const EXAMPLE_TRADES = [
  "Long US30, risk 1%, entry 47383, stop 47283, TP 47481, still open.",
  "Short EURUSD, risk $50, entry 1.0875, stop 1.0910, TP 1.0820.",
  "Long BTCUSD, risk 0.5%, market entry now, stop 47000, TP 49000."
];

const LogWithAI: React.FC<LogWithAIProps> = ({ onParsedData, isLoading, onParseText, error, onQuickSubmit, canQuickSubmit, isSubmitting }) => {
  const [tradeText, setTradeText] = useState('');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFillForm = async () => {
    if (tradeText.trim()) {
      await onParseText(tradeText);
    }
  };

  const handleExampleClick = (example: string) => {
    setTradeText(example);
  };

  // Collapsed state - just show a button
  if (!isExpanded) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-photonic-blue/10 hover:bg-photonic-blue/20 border border-photonic-blue/30 rounded-lg transition-all text-xs text-photonic-blue"
        >
          <SparklesIcon className="w-4 h-4" />
          <span>Log with AI (Optional)</span>
        </button>
      </div>
    );
  }

  // Expanded state - show full AI input
  return (
    <div className="bg-future-dark/30 border border-photonic-blue/20 rounded-lg p-5 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-photonic-blue" />
          <h3 className="text-xs font-orbitron text-photonic-blue/90 uppercase tracking-wide">
            Log with AI (Optional)
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-future-gray/60 hover:text-future-gray text-xs"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-future-gray/70 mb-4">
        Describe your trade in one sentence. We'll fill the form for you.
      </p>

      <div className="mb-4">
        <textarea
          id="ai-trade-input"
          value={tradeText}
          onChange={(e) => setTradeText(e.target.value)}
          placeholder="Format: [Direction] [Asset], risk [X% or $X], entry [price], stop [price], TP [price], [open/closed].
Example: Long US30, risk 1%, entry 47383, stop 47283, TP 47481, still open."
          className="w-full bg-[#0C0D0E] border border-white/10 rounded px-3 py-2 text-future-light placeholder-future-gray/40 focus:outline-none focus:ring-1 focus:ring-photonic-blue/50 focus:border-photonic-blue/50 transition-all duration-200 text-xs leading-relaxed min-h-[70px] resize-none"
          rows={3}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleFillForm}
            disabled={isLoading || !tradeText.trim()}
            variant="secondary"
            className="text-xs py-2 px-4"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <span>Analyzing...</span>
              </div>
            ) : (
              'Fill Form'
            )}
          </Button>

          {/* Quick Submit Button - Shows after AI fills the form */}
          {canQuickSubmit && onQuickSubmit && (
            <Button
              type="button"
              onClick={onQuickSubmit}
              variant="primary"
              disabled={isSubmitting}
              className="text-xs py-2 px-4 animate-fade-in"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span>Logging...</span>
                </div>
              ) : (
                '✓ Log Trade'
              )}
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCheatSheet(!showCheatSheet)}
          className="text-xs text-photonic-blue/70 hover:text-photonic-blue transition-colors underline"
        >
          {showCheatSheet ? 'Hide' : 'Show'} mini cheat sheet
        </button>
      </div>

      {/* Example Chips */}
      <div className="mb-4">
        <p className="text-[10px] text-future-gray/60 mb-2 uppercase tracking-wider">Examples (click to try):</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TRADES.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="text-[10px] bg-photonic-blue/10 hover:bg-photonic-blue/20 text-photonic-blue border border-photonic-blue/30 rounded-full px-3 py-1 transition-colors"
            >
              Example {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Cheat Sheet */}
      {showCheatSheet && (
        <div className="animate-fade-in-up bg-[#0C0D0E] border border-white/10 rounded p-3 text-[11px] space-y-1.5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">Direction + Asset:</span>
            <span className="text-future-gray/70">"Long US30", "Short EURUSD"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">Risk:</span>
            <span className="text-future-gray/70">"risk 1%" or "risk $50"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">Entry:</span>
            <span className="text-future-gray/70">"entry 47383" or "market entry now"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">Stop / TP:</span>
            <span className="text-future-gray/70">"stop 47283, TP 47481"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">Status (optional):</span>
            <span className="text-future-gray/70">"still open" or "closed at 47481"</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-2.5 bg-risk-high/10 border border-risk-high/30 rounded text-xs text-risk-high">
          {error}
        </div>
      )}

      {/* Parse Warning */}
      {!error && tradeText && (
        <p className="mt-2 text-[10px] text-future-gray/60 italic">
          💡 If some fields aren't detected, you can add them manually below.
        </p>
      )}
    </div>
  );
};

export default LogWithAI;
