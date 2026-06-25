import React, { useState } from 'react';
import { useTrade } from '../../context/TradeContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { Direction } from '../../types';

interface QuickLogFormProps {
    onClose: () => void;
}

const QuickLogForm: React.FC<QuickLogFormProps> = ({ onClose }) => {
    const { createTrade } = useTrade();

    const [asset, setAsset] = useState('');
    const [direction, setDirection] = useState<Direction>(Direction.Buy);
    const [profitLoss, setProfitLoss] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            });
            onClose();
        } catch (error) {
            console.error("Failed to quick log trade", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const plValue = parseFloat(profitLoss);
    const plColor = plValue > 0 ? 'text-jtp-profit' : plValue < 0 ? 'text-jtp-loss' : 'text-jtp-text';

    return (
        <div className="bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel p-4 mb-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-jtp-base font-semibold text-jtp-text">Quick Log Trade</h3>
                <button
                    onClick={onClose}
                    className="text-jtp-textDim hover:text-jtp-text transition-colors text-jtp-lg leading-none"
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-jtp-xs text-jtp-textDim mb-1">Asset</label>
                    <input
                        type="text"
                        value={asset}
                        onChange={(e) => setAsset(e.target.value)}
                        placeholder="EURUSD"
                        className="w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-2 text-jtp-base text-jtp-text focus:border-jtp-blue outline-none transition-colors"
                        required
                    />
                </div>

                <div className="w-full md:w-32">
                    <label className="block text-jtp-xs text-jtp-textDim mb-1">Direction</label>
                    <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value as Direction)}
                        className="w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-2 text-jtp-base text-jtp-text focus:border-jtp-blue outline-none transition-colors"
                    >
                        <option value={Direction.Buy}>Long</option>
                        <option value={Direction.Sell}>Short</option>
                    </select>
                </div>

                <div className="flex-1 w-full">
                    <label className="block text-jtp-xs text-jtp-textDim mb-1">P/L ($)</label>
                    <input
                        type="number"
                        value={profitLoss}
                        onChange={(e) => setProfitLoss(e.target.value)}
                        placeholder="150.00"
                        step="0.01"
                        className={`w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-2 text-jtp-base focus:border-jtp-blue outline-none transition-colors font-mono ${profitLoss ? plColor : 'text-jtp-text'}`}
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
