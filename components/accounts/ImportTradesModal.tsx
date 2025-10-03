import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { BrokerAccount } from '../../types';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import FileDropzone from '../ui/FileDropzone';
import { parseBrokerReport, ParsedTradeData } from '../../utils/csvParser';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { useTrade } from '../../context/TradeContext';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

type Stage = 'upload' | 'review' | 'loading' | 'success' | 'error';

interface ImportTradesModalProps {
  account: BrokerAccount;
  onClose: () => void;
}

const ImportTradesModal: React.FC<ImportTradesModalProps> = ({ account, onClose }) => {
  const { playbooks } = usePlaybook();
  const { bulkImportTrades } = useTrade();

  const [stage, setStage] = useState<Stage>('upload');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(playbooks[0]?.id || '');
  const [parsedTrades, setParsedTrades] = useState<ParsedTradeData[]>([]);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState({ imported: 0, skipped: 0 });

  const handleFileAccepted = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const trades = parseBrokerReport(text);
        if (trades.length === 0) {
            throw new Error("No valid trades found in the 'Deals' section of the report.");
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

  const renderUploadStage = () => (
    <div className="space-y-4">
      <p className="text-sm text-future-gray">
        Upload your broker's CSV report. The system will automatically detect and import your closed trades.
      </p>
      <SelectInput
        label="Assign all imported trades to this playbook:"
        id="playbookId"
        value={selectedPlaybookId}
        onChange={(e) => setSelectedPlaybookId(e.target.value)}
        options={playbooks.map(p => ({ value: p.id, label: p.name }))}
        disabled={playbooks.length === 0}
      />
      {playbooks.length === 0 && <p className="text-sm text-risk-medium -mt-2">Please create a playbook before importing trades.</p>}
      <FileDropzone
        onFileAccepted={handleFileAccepted}
        accept=".csv,.txt"
        label="Drag & drop report here, or click to select"
      />
    </div>
  );

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
            <Button variant="secondary" onClick={() => setStage('upload')} className="w-auto">Back</Button>
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
            <Button onClick={() => setStage('upload')} className="w-auto">Try Again</Button>
       </div>
  );

  const renderContent = () => {
    switch(stage) {
        case 'review': return renderReviewStage();
        case 'loading': return renderLoadingStage();
        case 'success': return renderSuccessStage();
        case 'error': return renderErrorStage();
        case 'upload':
        default: return renderUploadStage();
    }
  }

  return (
    <Modal title={`Import Trades for "${account.name}"`} onClose={onClose} size="xl">
      {renderContent()}
    </Modal>
  );
};

export default ImportTradesModal;
