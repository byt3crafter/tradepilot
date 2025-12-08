import React, { useState, useEffect } from 'react';
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
  initialExpanded?: boolean;
}

const EXAMPLE_TRADE = "Long US30, entry 47383, stop 47283, TP 47481";

const LogWithAI: React.FC<LogWithAIProps> = ({ onParsedData, isLoading, onParseText, error, onQuickSubmit, canQuickSubmit, isSubmitting, initialExpanded = false }) => {
  const [tradeText, setTradeText] = useState('');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [hint, setHint] = useState('');

  // Dynamic hints - same logic as SmartTradeInput
  const getNextHint = (input: string): string => {
    if (!input.trim()) return "";

    const hasDirection = /\b(long|short|buy|sell)\b/i.test(input);
    const hasAsset = /\b(us30|btc|eurusd|gold)\b/i.test(input);
    const hasEntry = /entry\s*:?\s*\d+(\.\d+)?/i.test(input);
    const hasStop = /stop\s*:?\s*\d+(\.\d+)?/i.test(input);
    const hasTP = /tp\s*:?\s*\d+(\.\d+)?/i.test(input);

    if (!hasDirection) return "Direction (Long/Short)";
    if (!hasAsset) return "Asset (e.g., US30, EURUSD, BTC)";
    if (!hasEntry) return "entry XXXX";
    if (!hasStop) return "stop XXXX";
    if (!hasTP) return "TP XXXX";

    return "Ready! Click 'Fill Form' ✓";
  };

  useEffect(() => {
    setHint(getNextHint(tradeText));
  }, [tradeText]);

  const handleFillForm = async () => {
    if (tradeText.trim()) {
      await onParseText(tradeText);
    }
  };

  const handleExampleClick = () => {
    setTradeText(EXAMPLE_TRADE);
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

      <div className="mb-2">
        <textarea
          id="ai-trade-input"
          value={tradeText}
          onChange={(e) => setTradeText(e.target.value)}
          placeholder="Long US30, entry 47383, stop 47283, TP 47481"
          className="w-full bg-[#0C0D0E] border border-white/10 rounded px-3 py-2 text-future-light placeholder-future-gray/40 focus:outline-none focus:ring-1 focus:ring-photonic-blue/50 focus:border-photonic-blue/50 transition-all duration-200 text-xs leading-relaxed min-h-[50px] resize-none"
          rows={2}
        />
      </div>

      {/* Dynamic Hint - Below the input */}
      {tradeText.length > 0 && hint && hint !== "Ready! Click 'Fill Form' ✓" && (
        <div className="text-xs text-photonic-blue/70 mb-3 animate-fade-in">
          💡 <span className="font-medium">Next: {hint}</span>
        </div>
      )}
      {hint === "Ready! Click 'Fill Form' ✓" && (
        <div className="text-xs text-momentum-green/70 mb-3 animate-fade-in">
          ✓ <span className="font-medium">{hint}</span>
        </div>
      )}

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

      {/* Example Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleExampleClick}
          className="text-[10px] bg-photonic-blue/10 hover:bg-photonic-blue/20 text-photonic-blue border border-photonic-blue/30 rounded-full px-3 py-1 transition-colors"
        >
          📝 Try Example
        </button>
      </div>

      {/* Cheat Sheet */}
      {showCheatSheet && (
        <div className="animate-fade-in-up bg-[#0C0D0E] border border-white/10 rounded p-3 text-[11px] space-y-1.5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">1. Direction:</span>
            <span className="text-future-gray/70">"Long" or "Short"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">2. Asset:</span>
            <span className="text-future-gray/70">"US30", "EURUSD", "BTC", etc.</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">3. Entry:</span>
            <span className="text-future-gray/70">"entry 47383"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">4. Stop:</span>
            <span className="text-future-gray/70">"stop 47283"</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-photonic-blue font-semibold">5. Take Profit:</span>
            <span className="text-future-gray/70">"TP 47481"</span>
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

