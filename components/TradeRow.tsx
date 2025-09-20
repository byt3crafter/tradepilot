import React, { useState } from 'react';
import { Trade, TradeResult, Direction } from '../types';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { DropdownMenu, DropdownMenuItem } from './ui/DropdownMenu';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useTrade } from '../context/TradeContext';
import { useStrategy } from '../context/StrategyContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import Button from './ui/Button';
import Spinner from './Spinner';
import AiAnalysisDisplay from './trades/AiAnalysisDisplay';

interface TradeRowProps {
  trade: Trade;
  onEdit: () => void;
}

const ResultBadge: React.FC<{ result?: TradeResult | null }> = ({ result }) => {
  if (!result) return <span className="text-future-gray">–</span>;
  
  const styles: Record<TradeResult, string> = {
    [TradeResult.Win]: 'text-momentum-green bg-momentum-green/10 border-momentum-green/30',
    [TradeResult.Loss]: 'text-risk-high bg-risk-high/10 border-risk-high/30',
    [TradeResult.Breakeven]: 'text-risk-medium bg-risk-medium/10 border-risk-medium/30',
  };

  return (
    <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[result]}`}>
      {result}
    </div>
  );
};

const DirectionIndicator: React.FC<{ direction: Direction }> = ({ direction }) => {
    const isBuy = direction === 'Buy';
    const colorClass = isBuy ? 'text-momentum-green' : 'text-risk-high';
    const Icon = isBuy ? ArrowUpIcon : ArrowDownIcon;

    return (
        <div className={`flex items-center gap-2 ${colorClass}`}>
            <Icon className="w-3 h-3" />
            <span>{direction}</span>
        </div>
    );
};

const DetailItem: React.FC<{ label: string, children: React.ReactNode, className?: string }> = ({ label, children, className = '' }) => (
    <div className={className}>
        <span className="text-xs text-future-gray font-orbitron uppercase">{label}</span>
        <div className="mt-1 text-future-light">{children}</div>
    </div>
);

const TradeRow: React.FC<TradeRowProps> = ({ trade, onEdit }) => {
  const { deleteTrade, analyzeTrade } = useTrade();
  const { strategies } = useStrategy();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isWin = trade.result === TradeResult.Win;
  const isLoss = trade.result === TradeResult.Loss;
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(trade.id);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeTrade(trade.id);
    } catch(err) {
      console.error(err);
      alert('Failed to analyze trade. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const profitLossColor = isWin ? 'text-momentum-green' : isLoss ? 'text-risk-high' : 'text-risk-medium';
  const strategyName = strategies.find(s => s.id === trade.strategyId)?.name || 'Unknown';
  const canAnalyze = trade.screenshotBeforeUrl && trade.screenshotAfterUrl && !trade.aiAnalysis;


  return (
    <>
      <tr 
        className="border-b border-future-panel/50 hover:bg-photonic-blue/5 transition-colors duration-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="p-3 text-center">
            <ChevronDownIcon className={`w-5 h-5 text-future-gray transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </td>
        <td className="p-3 font-tech-mono text-future-gray">{new Date(trade.tradeDate).toLocaleDateString()}</td>
        <td className="p-3 font-tech-mono font-semibold text-future-light">{trade.asset}</td>
        <td className="p-3 font-tech-mono"><DirectionIndicator direction={trade.direction} /></td>
        <td className="p-3 font-tech-mono text-future-light">{trade.entryPrice.toFixed(2)}</td>
        <td className="p-3 font-tech-mono text-future-gray">{trade.riskPercentage.toFixed(2)}%</td>
        <td className="p-3 text-future-gray text-xs max-w-xs truncate">{trade.notes || '–'}</td>
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
              <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete} className="text-risk-high hover:bg-risk-high/10">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete
              </DropdownMenuItem>
          </DropdownMenu>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-future-panel/30">
            <td></td>
            <td colSpan={7} className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                    <DetailItem label="Exit Price">{trade.exitPrice?.toFixed(2) ?? '–'}</DetailItem>
                    <DetailItem label="P/L"><span className={profitLossColor}>${trade.profitLoss?.toFixed(2) ?? '–'}</span></DetailItem>
                    <DetailItem label="Result"><ResultBadge result={trade.result} /></DetailItem>
                    <DetailItem label="R:R">{trade.rr?.toFixed(2) ?? '–'}</DetailItem>
                    <DetailItem label="Strategy" className="col-span-full">{strategyName}</DetailItem>
                </div>

                <div className="mt-4 pt-4 border-t border-photonic-blue/10">
                    <div className="flex flex-col md:flex-row gap-4">
                       <div className="flex-1">
                            <h4 className="text-sm font-orbitron text-photonic-blue/80 mb-2">Screenshots</h4>
                            <div className="flex gap-4">
                                <div className="w-1/2">
                                    <span className="text-xs text-future-gray">Before Entry</span>
                                    {trade.screenshotBeforeUrl ? <img src={trade.screenshotBeforeUrl} alt="Before trade" className="mt-1 rounded-md border border-future-panel" /> : <div className="mt-1 h-24 bg-future-dark/50 rounded-md flex items-center justify-center text-xs text-future-gray">Not provided</div>}
                                </div>
                                <div className="w-1/2">
                                    <span className="text-xs text-future-gray">After Exit</span>
                                    {trade.screenshotAfterUrl ? <img src={trade.screenshotAfterUrl} alt="After trade" className="mt-1 rounded-md border border-future-panel" /> : <div className="mt-1 h-24 bg-future-dark/50 rounded-md flex items-center justify-center text-xs text-future-gray">Not provided</div>}
                                </div>
                            </div>
                       </div>
                       <div className="flex-1">
                            <h4 className="text-sm font-orbitron text-photonic-blue/80 mb-2">AI Analysis</h4>
                            {trade.aiAnalysis ? (
                                <AiAnalysisDisplay analysis={trade.aiAnalysis} />
                            ) : canAnalyze ? (
                                <div className="h-full flex flex-col items-center justify-center bg-future-dark/50 p-4 rounded-md">
                                    <p className="text-sm text-future-gray mb-3 text-center">Ready to analyze trade execution.</p>
                                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-auto">
                                        {isAnalyzing ? <Spinner /> : 'Analyze with AI'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center bg-future-dark/50 p-4 rounded-md">
                                     <p className="text-sm text-future-gray text-center">Upload "Before" and "After" screenshots to enable AI analysis.</p>
                                </div>
                            )}
                       </div>
                    </div>
                </div>
            </td>
        </tr>
      )}
    </>
  );
};

export default TradeRow;
