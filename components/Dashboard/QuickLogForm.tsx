import React, { useState } from 'react';
import { useTrade } from '../../context/TradeContext';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import LogWithAI from '../trades/LogWithAI';
import api from '../../services/api';
import { Direction } from '../../types';

interface QuickLogFormProps {
    onClose: () => void;
}

const QuickLogForm: React.FC<QuickLogFormProps> = ({ onClose }) => {
    const { createTrade } = useTrade();
    const { activeAccount } = useAccount();
    const { getToken } = useAuth();

    const [asset, setAsset] = useState('');
    const [direction, setDirection] = useState<Direction>(Direction.Buy);
    const [profitLoss, setProfitLoss] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showAI, setShowAI] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!asset || !profitLoss) return;

        setIsSubmitting(true);
        try {
            await createTrade({
                asset: asset.toUpperCase(),
                direction,
                profitLoss: parseFloat(profitLoss),
                result: parseFloat(profitLoss) >= 0 ? 'Win' : 'Loss',
                entryDate: new Date().toISOString(),
                exitDate: new Date().toISOString(),
                status: 'Closed', // Quick log assumes closed trade usually, or we can ask? User said "P/L", so it implies closed.
            });
            onClose();
        } catch (error) {
            console.error("Failed to quick log trade", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleParseText = async (text: string) => {
        setIsAILoading(true);
        setAiError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");

            // We don't have availableAssets list handy here easily without fetching, 
            // but we can pass empty or fetch from context if available. 
            // For now passing empty array, backend handles it.
            const parsed = await api.parseTradeText(text, [], token);

            if (parsed.asset) setAsset(parsed.asset);
            if (parsed.direction) setDirection(parsed.direction);
            if (parsed.profitLoss !== undefined && parsed.profitLoss !== null) setProfitLoss(parsed.profitLoss.toString());

            // If we have enough data, we could auto-submit, but let's let user verify.
        } catch (err: any) {
            setAiError(err.message || "Failed to parse text");
        } finally {
            setIsAILoading(false);
        }
    };

    return (
        <div className="bg-[#0C0D0E] border border-white/10 rounded-lg p-4 mb-6 animate-fade-in-down shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-orbitron text-white">Quick Log Trade</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {showAI ? (
                <LogWithAI
                    onParsedData={() => { }} // Not used directly, we use onParseText side effects
                    isLoading={isAILoading}
                    onParseText={handleParseText}
                    error={aiError}
                    onQuickSubmit={handleSubmit}
                    canQuickSubmit={!!asset && !!profitLoss}
                    isSubmitting={isSubmitting}
                    initialExpanded={true}
                />
            ) : (
                <button
                    onClick={() => setShowAI(true)}
                    className="text-xs text-photonic-blue hover:text-photonic-blue/80 mb-4 flex items-center gap-1"
                >
                    <span className="text-lg">✨</span> Log with AI / Voice
                </button>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs text-gray-400 mb-1">Asset</label>
                    <input
                        type="text"
                        value={asset}
                        onChange={(e) => setAsset(e.target.value)}
                        placeholder="EURUSD"
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-photonic-blue outline-none"
                        required
                    />
                </div>

                <div className="w-full md:w-32">
                    <label className="block text-xs text-gray-400 mb-1">Direction</label>
                    <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value as Direction)}
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-photonic-blue outline-none"
                    >
                        <option value={Direction.Buy}>Long</option>
                        <option value={Direction.Sell}>Short</option>
                    </select>
                </div>

                <div className="flex-1 w-full">
                    <label className="block text-xs text-gray-400 mb-1">P/L ($)</label>
                    <input
                        type="number"
                        value={profitLoss}
                        onChange={(e) => setProfitLoss(e.target.value)}
                        placeholder="150.00"
                        step="0.01"
                        className={`w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:border-photonic-blue outline-none ${parseFloat(profitLoss) > 0 ? 'text-momentum-green' : parseFloat(profitLoss) < 0 ? 'text-risk-high' : 'text-white'
                            }`}
                        required
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className="w-full md:w-auto whitespace-nowrap"
                    >
                        {isSubmitting ? <Spinner size="sm" /> : 'Log Trade'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default QuickLogForm;
