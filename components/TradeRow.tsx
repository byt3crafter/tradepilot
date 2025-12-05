import React, { useState, useMemo } from 'react';
import { Trade, TradeResult, Direction } from '../types';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { DropdownMenu, DropdownMenuItem } from './ui/DropdownMenu';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useTrade } from '../context/TradeContext';
import { usePlaybook } from '../context/PlaybookContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import Button from './ui/Button';
import Spinner from './Spinner';
import AiAnalysisDisplay from './trades/AiAnalysisDisplay';
import JournalEntry from './journal/JournalEntry';
import Modal from './ui/Modal';
import JournalForm from './journal/JournalForm';
import { PlusIcon } from './icons/PlusIcon';
import { useAssets } from '../context/AssetContext';
import { usePriceFormatter } from '../hooks/usePriceFormatter';
import Checkbox from './ui/Checkbox';

interface TradeRowProps {
  trade: Trade;
  onEdit: () => void;
  isSelected: boolean;
  onSelect: (tradeId: string) => void;
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
    const isBuy = direction === Direction.Buy;
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
        <div className="mt-1 text-future-light font-tech-mono">{children}</div>
    </div>
);

const SectionHeader: React.FC<{ title: string; sectionKey: string; isOpen: boolean; onClick: (key: string) => void }> = ({ title, sectionKey, isOpen, onClick }) => (
    <button type="button" className="w-full flex items-center justify-between py-2" onClick={() => onClick(sectionKey)}>
        <h4 className="text-sm font-orbitron text-photonic-blue/80">{title}</h4>
        <ChevronDownIcon className={`w-5 h-5 text-photonic-blue/80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
);

const calculateDuration = (start?: string | null, end?: string | null): string => {
    if (!start || !end) return '–';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();

    if (diffMs < 0) return '–';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
};


const TradeRow: React.FC<TradeRowProps> = ({ trade, onEdit, isSelected, onSelect }) => {
  const { deleteTrade, analyzeTrade } = useTrade();
  const { playbooks } = usePlaybook();
  const { findSpec, isLoading: isAssetsLoading } = useAssets();
  const { formatPrice } = usePriceFormatter(trade.asset);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const assetSpec = findSpec(trade.asset);
  
  const pipsMoved = useMemo(() => {
    if (isAssetsLoading) {
      return null;
    }
    
    const { entryPrice, exitPrice, direction } = trade;
    const pipSize = assetSpec?.pipSize ?? 1;

    if (pipSize <= 0 || typeof exitPrice !== 'number' || typeof entryPrice !== 'number') {
      return null;
    }

    if (direction === 'Buy') {
      return (exitPrice - entryPrice) / pipSize;
    } else {
      return (entryPrice - exitPrice) / pipSize;
    }
  }, [trade, assetSpec, isAssetsLoading]);

  const pipsColor = pipsMoved === null ? 'text-future-gray' : pipsMoved > 0 ? 'text-momentum-green' : pipsMoved < 0 ? 'text-risk-high' : 'text-risk-medium';

  const toggleSection = (sectionKey: string) => {
    const newOpenSection = openSection === sectionKey ? null : sectionKey;
    setOpenSection(newOpenSection);
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    // Do not expand if the click was on the checkbox cell or the action menu dropdown
    if (target.closest('.checkbox-cell') || target.closest('[data-dropdown-menu]')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        await deleteTrade(trade.id);
      } catch (err) {
        console.error('Failed to delete trade:', err);
        alert('Could not delete the trade. Please try again.');
      }
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
  
  const playbookName = playbooks.find(s => s.id === trade.playbookId)?.name || 'Unknown';
  const canAnalyze = trade.screenshotBeforeUrl && trade.screenshotAfterUrl && !trade.aiAnalysis;

  const netProfitLoss = trade.profitLoss ?? 0;
  const commission = trade.commission ?? 0;
  const swap = trade.swap ?? 0;
  const grossProfitLoss = netProfitLoss + commission + swap;

  const profitLossColor = grossProfitLoss > 0 ? 'text-momentum-green' : grossProfitLoss < 0 ? 'text-risk-high' : 'text-risk-medium';
  const netProfitLossColor = netProfitLoss > 0 ? 'text-momentum-green' : netProfitLoss < 0 ? 'text-risk-high' : 'text-risk-medium';
  
  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleString(undefined, {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  
  const renderPipsCell = () => {
    if (isAssetsLoading) {
        return <span className="text-xs text-future-gray">...</span>;
    }
    if (pipsMoved !== null) {
        return (
            <span className={`${pipsColor} font-semibold`}>
                {pipsMoved.toFixed(1)}
            </span>
        );
    }
    return '–';
  };

  return (
    <>
      <tr 
        className={`border-b border-future-panel/50 transition-colors duration-200 cursor-pointer ${isSelected ? 'bg-photonic-blue/10' : 'hover:bg-photonic-blue/5'}`}
        onClick={handleRowClick}
      >
        <td className="p-3 checkbox-cell" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            id={`select-trade-${trade.id}`}
            checked={isSelected}
            onChange={() => onSelect(trade.id)}
          />
        </td>
        <td className="p-3 text-center">
            <ChevronDownIcon className={`w-5 h-5 text-future-gray transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </td>
        <td className="p-3 font-tech-mono text-future-gray">{new Date(trade.entryDate).toLocaleDateString()}</td>
        <td className="p-3 font-tech-mono font-semibold text-future-light">{trade.asset}</td>
        <td className="p-3 font-tech-mono"><DirectionIndicator direction={trade.direction} /></td>
        <td className="p-3 font-tech-mono text-future-light">{formatPrice(trade.entryPrice)}</td>
        <td className="p-3 font-tech-mono text-future-gray">{trade.riskPercentage.toFixed(2)}%</td>
        <td className="p-3 font-tech-mono"><ResultBadge result={trade.result} /></td>
        <td className="p-3 font-tech-mono">{renderPipsCell()}</td>
        <td className="p-3 font-tech-mono">
          <span className={`${netProfitLossColor} font-semibold`}>
            ${netProfitLoss.toFixed(2)}
          </span>
        </td>
        <td className="p-3" data-dropdown-menu>
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
        <tr className="bg-black/20">
            <td></td>
            <td colSpan={10} className="p-4">
              <div className="relative">
                <Button
                    onClick={onEdit}
                    variant="link"
                    className="absolute top-0 right-0 flex items-center gap-1 text-sm p-0"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                </Button>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-6 text-sm pr-16 mb-4">
                    <DetailItem label="ENTRY TIME">{formatDateTime(trade.entryDate)}</DetailItem>
                    <DetailItem label="EXIT TIME">{formatDateTime(trade.exitDate)}</DetailItem>
                    <DetailItem label="DURATION">{calculateDuration(trade.entryDate, trade.exitDate)}</DetailItem>
                    <DetailItem label="ENTRY PRICE">{formatPrice(trade.entryPrice)}</DetailItem>
                    <DetailItem label="EXIT PRICE">{formatPrice(trade.exitPrice)}</DetailItem>
                    
                    <DetailItem label="STOP LOSS">{formatPrice(trade.stopLoss)}</DetailItem>
                    <DetailItem label="TAKE PROFIT">{formatPrice(trade.takeProfit)}</DetailItem>
                    <DetailItem label="LOT SIZE">{trade.lotSize ?? '–'}</DetailItem>
                    <DetailItem label="R:R">{trade.rr ? (typeof trade.rr === 'number' ? trade.rr.toFixed(2) : trade.rr) : '–'}</DetailItem>
                    <DetailItem label="PIPS">
                        {renderPipsCell()}
                    </DetailItem>
                    <DetailItem label="GROSS P/L"><span className={profitLossColor}>${grossProfitLoss.toFixed(2)}</span></DetailItem>
                    
                    <DetailItem label="COMMISSION">{trade.commission ? `-$${commission.toFixed(2)}` : '–'}</DetailItem>
                    <DetailItem label="SWAP">{trade.swap ? `-$${swap.toFixed(2)}` : '–'}</DetailItem>
                    <DetailItem label="NET P/L"><span className={`${netProfitLossColor} font-semibold`}>${netProfitLoss.toFixed(2)}</span></DetailItem>
                </div>

                <div className="border-t border-photonic-blue/10">
                   <SectionHeader title="Screenshots" sectionKey="screenshots" isOpen={openSection === 'screenshots'} onClick={toggleSection} />
                   {openSection === 'screenshots' && (
                     <div className="animate-fade-in-up flex flex-col md:flex-row gap-4 mb-4">
                        <div className="w-full md:w-1/2">
                            <span className="text-xs text-future-gray">Before Entry</span>
                            {trade.screenshotBeforeUrl ? <img src={trade.screenshotBeforeUrl} alt="Before trade" className="mt-1 rounded-md border border-future-panel" /> : <div className="mt-1 h-24 bg-future-dark/50 rounded-md flex items-center justify-center text-xs text-future-gray">Not provided</div>}
                        </div>
                        <div className="w-full md:w-1/2">
                            <span className="text-xs text-future-gray">After Exit</span>
                            {trade.screenshotAfterUrl ? <img src={trade.screenshotAfterUrl} alt="After trade" className="mt-1 rounded-md border border-future-panel" /> : <div className="mt-1 h-24 bg-future-dark/50 rounded-md flex items-center justify-center text-xs text-future-gray">Not provided</div>}
                        </div>
                    </div>
                   )}
                </div>

                <div className="border-t border-photonic-blue/10">
                   <SectionHeader title="My Journal" sectionKey="journal" isOpen={openSection === 'journal'} onClick={toggleSection} />
                   {openSection === 'journal' && (
                     <div className="animate-fade-in-up">
                          {trade.tradeJournal ? (
                              <JournalEntry journal={trade.tradeJournal} />
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center bg-future-dark/50 p-4 rounded-md">
                                  <p className="text-sm text-future-gray mb-3 text-center">No journal entry yet. What did you learn?</p>
                                  <Button onClick={() => setIsJournalModalOpen(true)} className="w-auto flex items-center gap-2">
                                      <PlusIcon className="w-4 h-4" /> Add Journal Entry
                                  </Button>
                              </div>
                          )}
                     </div>
                   )}
                </div>

                <div className="border-t border-photonic-blue/10">
                   <SectionHeader title="AI Analysis" sectionKey="ai" isOpen={openSection === 'ai'} onClick={toggleSection} />
                   {openSection === 'ai' && (
                     <div className="animate-fade-in-up">
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
                   )}
                </div>
              </div>
            </td>
        </tr>
      )}
      {isJournalModalOpen && (
        <Modal title="Add Journal Entry" onClose={() => setIsJournalModalOpen(false)}>
          <JournalForm trade={trade} onSuccess={() => setIsJournalModalOpen(false)} />
        </Modal>
      )}
    </>
  );
};

export default TradeRow;