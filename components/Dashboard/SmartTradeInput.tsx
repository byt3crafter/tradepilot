import React, { useState, useRef, useEffect } from 'react';
import { useTrade } from '../../context/TradeContext';
import { useAuth } from '../../context/AuthContext';
import { usePlaybook } from '../../context/PlaybookContext';
import api from '../../services/api';
import { SparklesIcon } from '../icons/SparklesIcon';
import Spinner from '../Spinner';

const SmartTradeInput: React.FC = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { createTrade } = useTrade();
    const { getToken } = useAuth();
    const { playbooks } = usePlaybook();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Parse input to determine what's been entered
    const getNextHint = (input: string): string => {
        if (!input.trim()) return "Direction (Long/Short)";

        // Detect entered parts
        const hasDirection = /\b(long|short|buy|sell)\b/i.test(input);
        const hasAsset = /\b(us30|btc|eurusd|gold|[a-z]{3,6})\b/i.test(input);
        const hasEntry = /entry\s*:?\s*\d+(\.\d+)?/i.test(input);
        const hasStop = /stop\s*:?\s*\d+(\.\d+)?/i.test(input);
        const hasTP = /tp\s*:?\s*\d+(\.\d+)?/i.test(input);

        if (!hasDirection) return "Direction (Long/Short)";
        if (!hasAsset) return "Asset (e.g., US30, EURUSD, BTC)";
        if (!hasEntry) return "entry XXXX";
        if (!hasStop) return "stop XXXX";
        if (!hasTP) return "TP XXXX";

        return "Press Enter to log ✓";
    };

    const [hint, setHint] = useState(getNextHint(''));

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [text]);

    // Update hint when text changes
    useEffect(() => {
        setHint(getNextHint(text));
    }, [text]);

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleLogTrade();
        }
    };

    const handleLogTrade = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (!text.trim()) return;

        setIsLoading(true);
        setIsSuccess(false);
        setError(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");

            // Find a default playbook (e.g., "Unassigned" or the first one)
            // We need a playbookId to create a trade
            const defaultPlaybook = playbooks.find(p => p.name === "The Complete Strategist") || playbooks[0];
            if (!defaultPlaybook) {
                throw new Error("No playbooks found. Please create a playbook first.");
            }

            const parsed = await api.parseTradeText(text, [], token);
            console.log("Parsed trade data:", parsed);

            // Sanitize dates and numbers
            const sanitizedEntryDate = (parsed.entryDate && parsed.entryDate !== 'null') ? parsed.entryDate : new Date().toISOString();
            const sanitizedExitDate = (parsed.exitDate && parsed.exitDate !== 'null') ? parsed.exitDate : new Date().toISOString();

            let sanitizedProfitLoss: number | null = null;
            if (parsed.profitLoss !== undefined && parsed.profitLoss !== null && (parsed.profitLoss as any) !== 'null') {
                const val = Number(parsed.profitLoss);
                if (!isNaN(val)) sanitizedProfitLoss = val;
            }

            // STRICT Check: Trade is CLOSED only if we have BOTH Profit/Loss AND Exit Price
            // This prevents "Long US30..." (no exit price) from being marked as closed
            const hasExitPrice = parsed.exitPrice !== undefined && parsed.exitPrice !== null && parsed.exitPrice !== 0;
            const isClosed = sanitizedProfitLoss !== null && hasExitPrice;

            await createTrade({
                ...parsed,
                playbookId: defaultPlaybook.id,
                status: isClosed ? 'CLOSED' : 'LIVE',
                entryDate: sanitizedEntryDate,
                exitDate: isClosed ? sanitizedExitDate : null,
                exitPrice: isClosed ? parsed.exitPrice : null,
                profitLoss: isClosed ? sanitizedProfitLoss : null,
                result: isClosed ? (sanitizedProfitLoss! >= 0 ? 'Win' : 'Loss') : null
            });

            setText('');
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);

        } catch (err: any) {
            console.error("Failed to log trade", err);
            setError(err.message || "Failed to log trade");
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 max-w-2xl mx-0 sm:mx-6 relative group flex flex-col gap-2">
            <div className="relative w-full">
                <div className="absolute left-3 top-3 text-photonic-blue transition-opacity duration-300 group-focus-within:opacity-100 opacity-70">
                    {isLoading ? <Spinner size="sm" /> : <SparklesIcon className="w-4 h-4" />}
                </div>

                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Long US30, risk 1%, entry 47383, stop 47283, TP 47481"
                    className={`w-full bg-[#0C0D0E]/50 border ${error ? 'border-red-500/50' : 'border-white/5 hover:border-white/10'} focus:border-photonic-blue/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-photonic-blue/20 transition-all resize-none overflow-hidden min-h-[44px]`}
                    rows={1}
                    disabled={isLoading}
                />

                {/* Success Indicator */}
                {isSuccess && (
                    <div className="absolute right-3 top-2.5 text-momentum-green animate-fade-in">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}

                {/* Enter Hint - Only when ready to submit */}
                {text.length > 0 && !isLoading && !isSuccess && !error && hint === "Press Enter to log ✓" && (
                    <div className="absolute right-3 top-3 text-[10px] text-momentum-green border border-momentum-green/50 rounded px-1.5 py-0.5 hidden sm:block animate-pulse">
                        ↵ Enter
                    </div>
                )}
            </div>

            {/* Dynamic Hint - Below the input */}
            {text.length > 0 && !isLoading && !isSuccess && !error && hint !== "Press Enter to log ✓" && (
                <div className="text-xs text-photonic-blue/70 ml-1 animate-fade-in">
                    💡 <span className="font-medium">{hint}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="text-xs text-red-400 ml-1 animate-fade-in">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
};

export default SmartTradeInput;
