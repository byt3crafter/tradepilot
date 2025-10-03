
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { BrokerAccount, ParsedTradeData } from '../../types';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import FileDropzone from '../ui/FileDropzone';
import { parseCTraderCsvReport } from '../../utils/cTraderCsvParser';
import { parseCTraderHtmlReport } from '../../utils/cTraderHtmlParser';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { useTrade } from '../../context/TradeContext';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { CTraderIcon } from '../icons/CTraderIcon';
import { MetaTraderIcon } from '../icons/MetaTraderIcon';

type Stage = 'platform' | 'upload' | 'review' | 'loading' | 'success' | 'error';
type Platform = 'cTrader' | 'metaTrader';
type FileFormat = 'csv' | 'html' | 'xls';

interface ImportTradesModalProps {
  account: BrokerAccount;
  onClose: () => void;
}

const PlatformCard: React.FC<{ icon: React.ReactNode; label: string; description: string; onClick: () => void; disabled?: boolean }> = ({ icon, label, description, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full p-4 rounded-lg border-2 text-center transition-all duration-200 h-full flex flex-col items-center justify-center ${
      disabled 
        ? 'bg-future-dark/30 border-future-panel/50 cursor-not-allowed opacity-50' 
        : 'bg-future-dark/50 border-future-panel hover:border-photonic-blue/50 hover:bg-photonic-blue/10'
    }`}
  >
    {icon}
    <div className="font-semibold text-future-light mt-3">{label}</div>
    <div className="text-xs text-future-gray mt-1">{description}</div>
  </button>
);


const ImportTradesModal: React.FC<ImportTradesModalProps> = ({ account, onClose }) => {
  const { playbooks } = usePlaybook();
  const { bulkImportTrades } = useTrade();

  const [stage, setStage] = useState<Stage>('platform');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>('csv');

  const [selectedPlaybookId, setSelectedPlaybookId] = useState(playbooks[0]?.id || '');
  const [parsedTrades, setParsedTrades] = useState<ParsedTradeData[]>([]);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState({ imported: 0, skipped: 0 });

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setStage('upload');
  };

  const handleFileAccepted = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let trades: ParsedTradeData[];

        if (selectedPlatform === 'cTrader') {
          if (selectedFormat === 'csv') {
            trades = parseCTraderCsvReport(text);
          } else if (selectedFormat === 'html') {
            trades = parseCTraderHtmlReport(text);
          } else {
            throw new Error("Unsupported file format for cTrader.");
          }
        } else {
            throw new Error("Selected platform is not yet supported.");
        }

        if (trades.length === 0) {
            throw new Error("No valid trades found in the report file.");
        }
        setParsedTrades(trades);
        setStage('review');
      } catch (err: any) {
        setError(err.message || 'Failed to parse the file.');
        setStage('error');
      }
    };
    reader.readAsText(file);
  };
  
  const handleConfirmImport = async () => {
    setStage('loading');
    setError('');
    try {
        const result = await bulkImportTrades({
            brokerAccountId: account.id,
            playbookId: selectedPlaybookId,
            trades: parsedTrades,
        });
        setSuccessResult(result);
        setStage('success');
    } catch(err: any) {
        setError(err.message || "An unexpected error occurred during import.");
        setStage('error');
    }
  };
  
  const resetAndGoTo = (targetStage: Stage) => {
      setError('');
      setParsedTrades([]);
      if (targetStage === 'platform') {
          setSelectedPlatform(null);
      }
      setStage(targetStage);
  }

  const renderPlatformStage = () => (
    <div className="space-y-4">
        <h3 className="text-lg text-center font-semibold text-future-light">Which platform is this report from?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <PlatformCard
                icon={<CTraderIcon className="w-12 h-12" />}
                label="cTrader"
                description="Supports CSV & HTML reports"
                onClick={() => handlePlatformSelect('cTrader')}
            />
            <PlatformCard
                icon={<MetaTraderIcon className="w-12 h-12" />}
                label="MetaTrader 4/5"
                description="Coming Soon"
                onClick={() => {}}
                disabled
            />
        </div>
    </div>
  );

  const renderUploadStage = () => {
    const formatConfig = {
        csv: { accept: '.csv,.txt', label: `Drag & drop cTrader .csv report here, or click to select` },
        html: { accept: '.html,.htm', label: `Drag & drop cTrader .html report here, or click to select` },
        xls: { accept: '.xls,.xlsx', label: 'XLS format is coming soon' },
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-future-light">Upload Report</h3>
                <Button variant="link" onClick={() => resetAndGoTo('platform')} className="text-sm">Change Platform</Button>
            </div>
            
            <SelectInput
                label="1. Assign all imported trades to this playbook:"
                id="playbookId"
                value={selectedPlaybookId}
                onChange={(e) => setSelectedPlaybookId(e.target.value)}
                options={playbooks.map(p => ({ value: p.id, label: p.name }))}
                disabled={playbooks.length === 0}
            />
            {playbooks.length === 0 && <p className="text-sm text-risk-medium -mt-2">Please create a playbook before importing trades.</p>}
            
            <div>
                <label className="block text-sm font-medium text-future-gray mb-2">2. Select the report format:</label>
                <div className="flex items-center gap-2 rounded-lg bg-future-dark p-1 w-min">
                    <Button variant={selectedFormat === 'csv' ? 'primary' : 'secondary'} onClick={() => setSelectedFormat('csv')} className="w-auto px-4 py-1 text-sm !shadow-none">CSV</Button>
                    <Button variant={selectedFormat === 'html' ? 'primary' : 'secondary'} onClick={() => setSelectedFormat('html')} className="w-auto px-4 py-1 text-sm !shadow-none">HTML</Button>
                </div>
            </div>

            <FileDropzone
                onFileAccepted={handleFileAccepted}
                accept={formatConfig[selectedFormat].accept}
                label={formatConfig[selectedFormat].label}
            />
        </div>
    );
  };

  const renderReviewStage = () => (
    <div className="space-y-4">
        <p className="text-sm text-future-gray">
            Found <span className="font-semibold text-future-light">{parsedTrades.length}</span> trades to import. Review the data below before confirming.
        </p>
        <div className="max-h-64 overflow-y-auto border border-photonic-blue/20 rounded-md table-scrollbar">
            <table className="w-full text-xs">
                <thead className="sticky top-0 bg-future-panel">
                    <tr className="border-b border-photonic-blue/20">
                        {['Date', 'Asset', 'Direction', 'Entry', 'Exit', 'P/L'].map(h => 
                            <th key={h} className="p-2 text-left font-semibold text-future-gray">{h}</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {parsedTrades.slice(0, 50).map((trade, i) => (
                        <tr key={i} className="border-b border-future-dark/50">
                            <td className="p-2 font-tech-mono">{new Date(trade.exitDate).toLocaleDateString()}</td>
                            <td className="p-2 font-tech-mono">{trade.asset}</td>
                            <td className={`p-2 font-tech-mono ${trade.direction === 'Buy' ? 'text-momentum-green' : 'text-risk-high'}`}>{trade.direction}</td>
                            <td className="p-2 font-tech-mono">{trade.entryPrice.toFixed(4)}</td>
                            <td className="p-2 font-tech-mono">{trade.exitPrice.toFixed(4)}</td>
                            <td className={`p-2 font-tech-mono ${trade.profitLoss && trade.profitLoss > 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
                                ${trade.profitLoss?.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {parsedTrades.length > 50 && <p className="p-2 text-center text-xs text-future-gray">And {parsedTrades.length - 50} more trades...</p>}
        </div>
        <div className="flex justify-end gap-4 pt-4 border-t border-photonic-blue/10">
            <Button variant="secondary" onClick={() => resetAndGoTo('upload')} className="w-auto">Back</Button>
            <Button onClick={handleConfirmImport} className="w-auto" disabled={!selectedPlaybookId}>Confirm & Import</Button>
        </div>
    </div>
  );
  
  const renderLoadingStage = () => (
      <div className="flex flex-col items-center justify-center text-center p-8 h-48">
          <Spinner />
          <p className="mt-4 text-future-gray">Importing trades... this may take a moment.</p>
      </div>
  );

  const renderSuccessStage = () => (
      <div className="flex flex-col items-center justify-center text-center p-8 h-48">
          <CheckCircleIcon className="w-16 h-16 text-momentum-green" />
          <h3 className="text-xl font-semibold text-future-light mt-4">Import Complete!</h3>
          <p className="text-future-gray mt-2">
              Successfully imported {successResult.imported} trades.
              {successResult.skipped > 0 && ` Skipped ${successResult.skipped} duplicate trades.`}
          </p>
          <Button onClick={onClose} className="w-auto mt-6">Done</Button>
      </div>
  );

  const renderErrorStage = () => (
       <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-risk-high">Import Failed</h3>
            <p className="text-future-gray bg-future-dark/50 p-3 rounded-md">{error}</p>
            <Button onClick={() => resetAndGoTo('upload')} className="w-auto">Try Again</Button>
       </div>
  );

  const renderContent = () => {
    switch(stage) {
        case 'platform': return renderPlatformStage();
        case 'upload': return renderUploadStage();
        case 'review': return renderReviewStage();
        case 'loading': return renderLoadingStage();
        case 'success': return renderSuccessStage();
        case 'error': return renderErrorStage();
        default: return renderPlatformStage();
    }
  }

  return (
    <Modal title={`Import Trades for "${account.name}"`} onClose={onClose} size="xl">
      {renderContent()}
    </Modal>
  );
};

export default ImportTradesModal;
