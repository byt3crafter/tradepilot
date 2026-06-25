import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import { BrokerAccount, ParsedTradeData, Direction } from '../../types';
import { usePlaybook } from '../../context/PlaybookContext';
import FileDropzone from '../ui/FileDropzone';
import { parseCTraderCsvReport } from '../../utils/cTraderCsvParser';
import { parseCTraderHtmlReport } from '../../utils/cTraderHtmlParser';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { useTrade } from '../../context/TradeContext';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

// ─── Generic CSV support ──────────────────────────────────────────────────────

type ColumnMap = {
  asset?: string;
  direction?: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: string;
  exitPrice?: string;
  lotSize?: string;
  profitLoss?: string;
};

const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  asset: 'Asset / Symbol',
  direction: 'Direction (Buy/Sell)',
  entryDate: 'Entry Date',
  exitDate: 'Exit Date',
  entryPrice: 'Entry Price',
  exitPrice: 'Exit Price',
  lotSize: 'Lot Size (optional)',
  profitLoss: 'P/L (optional)',
};

const REQUIRED_FIELDS: (keyof ColumnMap)[] = ['asset', 'direction', 'entryPrice', 'exitPrice'];

const COLUMN_ALIASES: Record<keyof ColumnMap, string[]> = {
  asset: ['symbol', 'asset', 'pair', 'instrument', 'ticker', 'market', 'currency_pair'],
  direction: ['side', 'direction', 'type', 'buy_sell', 'trade_type', 'action'],
  entryDate: ['entry_date', 'entrydate', 'open_date', 'date', 'datetime', 'time', 'date_opened', 'open_time'],
  exitDate: ['exit_date', 'exitdate', 'close_date', 'date_closed', 'close_time', 'closing_time'],
  entryPrice: ['entry', 'entry_price', 'entryprice', 'open_price', 'open', 'price_open', 'entry_rate'],
  exitPrice: ['exit', 'exit_price', 'exitprice', 'close_price', 'close', 'price_close', 'exit_rate', 'closing_price'],
  lotSize: ['size', 'qty', 'quantity', 'lots', 'volume', 'lot_size', 'position_size'],
  profitLoss: ['pnl', 'profit', 'p&l', 'profit_loss', 'net_pnl', 'net_profit', 'pl', 'net_usd', 'netprofit', 'gross'],
};

function autoMapColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(h => h.toLowerCase().replace(/[\s\-/]/g, '_'));
  const map: ColumnMap = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ColumnMap, string[]][]) {
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.some(a => normalized[i] === a || normalized[i].startsWith(a) || normalized[i].endsWith(a))) {
        map[field] = headers[i];
        break;
      }
    }
  }
  return map;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let inQuotes = false;
  let cur = '';
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
}

function parseGenericCsv(text: string, map: ColumnMap): ParsedTradeData[] {
  const rows = text.trim().split('\n');
  if (rows.length < 2) throw new Error('CSV must have at least a header row and one data row.');

  const headers = parseCsvLine(rows[0]);
  const idx = (col: string | undefined) => (col ? headers.indexOf(col) : -1);

  const getCell = (row: string[], col: string | undefined) => {
    const i = idx(col);
    return i >= 0 ? (row[i] ?? '').replace(/^["']|["']$/g, '').trim() : '';
  };

  const parseDir = (val: string): Direction => {
    const v = val.toLowerCase().trim();
    if (v === 'buy' || v === 'long' || v === 'b') return Direction.Buy;
    if (v === 'sell' || v === 'short' || v === 's') return Direction.Sell;
    throw new Error(`Unknown direction value: "${val}". Expected Buy/Sell or Long/Short.`);
  };

  const trades: ParsedTradeData[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const row = parseCsvLine(rows[i]);

    try {
      const asset = getCell(row, map.asset);
      const dirRaw = getCell(row, map.direction);
      const entryRaw = getCell(row, map.entryPrice);
      const exitRaw = getCell(row, map.exitPrice);

      if (!asset || !dirRaw || !entryRaw || !exitRaw) continue;

      const direction = parseDir(dirRaw);
      const entryPrice = parseFloat(entryRaw);
      const exitPrice = parseFloat(exitRaw);

      if (isNaN(entryPrice) || isNaN(exitPrice)) continue;

      const entryDateRaw = getCell(row, map.entryDate);
      const exitDateRaw = getCell(row, map.exitDate);
      const plRaw = getCell(row, map.profitLoss);
      const lotRaw = getCell(row, map.lotSize);

      const now = new Date().toISOString();
      const parseDate = (s: string) => {
        if (!s) return now;
        const d = new Date(s);
        return isNaN(d.getTime()) ? now : d.toISOString();
      };

      trades.push({
        asset,
        direction,
        entryDate: parseDate(entryDateRaw),
        exitDate: parseDate(exitDateRaw || entryDateRaw),
        entryPrice,
        exitPrice,
        lotSize: lotRaw ? (isNaN(parseFloat(lotRaw)) ? null : parseFloat(lotRaw)) : null,
        profitLoss: plRaw ? (isNaN(parseFloat(plRaw)) ? null : parseFloat(plRaw)) : null,
      });
    } catch {
      // Skip malformed rows silently
    }
  }
  return trades;
}

// ─── Stage types ──────────────────────────────────────────────────────────────

type Stage = 'upload' | 'mapping' | 'review' | 'loading' | 'success' | 'error';

interface ImportTradesModalProps {
  account: BrokerAccount;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ImportTradesModal: React.FC<ImportTradesModalProps> = ({ account, onClose }) => {
  const { playbooks } = usePlaybook();
  const { bulkImportTrades } = useTrade();

  const [stage, setStage] = useState<Stage>('upload');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(() => playbooks[0]?.id || '');
  const [parsedTrades, setParsedTrades] = useState<ParsedTradeData[]>([]);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState({ imported: 0, skipped: 0 });

  // Generic CSV state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvText, setRawCsvText] = useState('');
  const [columnMap, setColumnMap] = useState<ColumnMap>({});

  const handleFileAccepted = useCallback((file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        // Try cTrader CSV
        const csvTrades = parseCTraderCsvReport(text);
        if (csvTrades.length > 0) {
          setParsedTrades(csvTrades);
          setStage('review');
          return;
        }
      } catch { /* not cTrader CSV */ }

      try {
        // Try cTrader HTML
        const htmlTrades = parseCTraderHtmlReport(text);
        if (htmlTrades.length > 0) {
          setParsedTrades(htmlTrades);
          setStage('review');
          return;
        }
      } catch { /* not cTrader HTML */ }

      // Fall back: treat as generic CSV
      try {
        const rows = text.trim().split('\n');
        if (rows.length < 2) throw new Error('File has fewer than 2 rows.');
        const headers = parseCsvLine(rows[0]);
        if (headers.length < 2) throw new Error('Could not parse CSV headers.');

        const autoMap = autoMapColumns(headers);
        setCsvHeaders(headers);
        setRawCsvText(text);
        setColumnMap(autoMap);

        // Check if all required fields were auto-detected
        const allMapped = REQUIRED_FIELDS.every(f => autoMap[f]);
        if (allMapped) {
          const trades = parseGenericCsv(text, autoMap);
          if (trades.length === 0) throw new Error('No valid trades found after parsing.');
          setParsedTrades(trades);
          setStage('review');
        } else {
          setStage('mapping');
        }
      } catch (err: any) {
        setError(err.message || 'Could not parse the file. Check that it is a valid CSV or cTrader HTML report.');
        setStage('error');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleApplyMapping = () => {
    setError('');
    const missing = REQUIRED_FIELDS.filter(f => !columnMap[f]);
    if (missing.length > 0) {
      setError(`Please map the following required fields: ${missing.map(f => FIELD_LABELS[f]).join(', ')}`);
      return;
    }
    try {
      const trades = parseGenericCsv(rawCsvText, columnMap);
      if (trades.length === 0) throw new Error('No valid trades found with the selected column mapping.');
      setParsedTrades(trades);
      setStage('review');
    } catch (err: any) {
      setError(err.message || 'Failed to parse trades with the given column mapping.');
    }
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
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during import.');
      setStage('error');
    }
  };

  const reset = (toStage: Stage = 'upload') => {
    setError('');
    setParsedTrades([]);
    setCsvHeaders([]);
    setRawCsvText('');
    setColumnMap({});
    setStage(toStage);
  };

  // ── Render stages ─────────────────────────────────────────────────────────

  const renderUpload = () => (
    <div className="space-y-5">
      <p className="text-jtp-sm text-jtp-textMuted">
        Drop a cTrader CSV/HTML report or any broker CSV. Columns are auto-detected.
      </p>

      {/* Playbook selector */}
      <div>
        <label htmlFor="import-playbook" className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-1.5">
          Assign imported trades to playbook <span className="text-jtp-loss">*</span>
        </label>
        {playbooks.length > 0 ? (
          <select
            id="import-playbook"
            value={selectedPlaybookId}
            onChange={e => setSelectedPlaybookId(e.target.value)}
            className="w-full px-3 py-[9px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
          >
            {playbooks.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-jtp-sm text-jtp-warning">Please create a playbook first before importing.</p>
        )}
      </div>

      {/* Supported formats */}
      <div className="flex gap-2">
        {['cTrader CSV', 'cTrader HTML', 'Generic CSV'].map(f => (
          <span key={f} className="px-2 py-0.5 rounded-jtp-md bg-jtp-raised border border-jtp-border text-jtp-xs text-jtp-textMuted">
            {f}
          </span>
        ))}
      </div>

      <FileDropzone
        onFileAccepted={handleFileAccepted}
        accept=".csv,.txt,.html,.htm"
        label="Drop your broker report here, or click to select (.csv, .html)"
      />
    </div>
  );

  const renderMapping = () => (
    <div className="space-y-5">
      <div>
        <p className="text-jtp-sm text-jtp-text font-semibold mb-1">Map your CSV columns</p>
        <p className="text-jtp-xs text-jtp-textMuted">
          We couldn't auto-detect all required columns. Map them manually below.
        </p>
      </div>

      <div className="space-y-3">
        {(Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]).map(field => (
          <div key={field} className="flex items-center gap-3">
            <div className="w-40 flex-shrink-0">
              <span className="text-jtp-xs text-jtp-textSoft">
                {FIELD_LABELS[field]}
                {REQUIRED_FIELDS.includes(field) && (
                  <span className="text-jtp-loss ml-0.5">*</span>
                )}
              </span>
            </div>
            <select
              value={columnMap[field] || ''}
              onChange={e => setColumnMap(prev => ({ ...prev, [field]: e.target.value || undefined }))}
              className="flex-1 px-3 py-[7px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
            >
              <option value="">— not mapped —</option>
              {csvHeaders.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-jtp-xs text-jtp-loss">{error}</p>
      )}

      <div className="flex justify-between pt-2 border-t border-jtp-border">
        <Button variant="secondary" onClick={() => reset('upload')} className="w-auto">
          Back
        </Button>
        <Button onClick={handleApplyMapping} className="w-auto">
          Preview Trades
        </Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-jtp-sm text-jtp-text">
          Found <span className="font-semibold">{parsedTrades.length}</span> trades to import.
          Review below before confirming.
        </p>
        <button
          onClick={() => reset('upload')}
          className="text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors"
        >
          Start over
        </button>
      </div>

      {/* Preview table */}
      <div className="max-h-56 overflow-y-auto border border-jtp-border rounded-jtp-panel bg-jtp-panel">
        <table className="w-full text-jtp-xs border-collapse">
          <thead className="sticky top-0 bg-jtp-active border-b border-jtp-borderStrong">
            <tr>
              {['Date', 'Asset', 'Dir', 'Entry', 'Exit', 'P/L'].map(h => (
                <th key={h} className="px-3 py-[9px] text-left font-semibold uppercase tracking-[0.4px] text-jtp-textDim whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedTrades.slice(0, 60).map((t, i) => {
              const isBuy = t.direction === Direction.Buy;
              const pl = t.profitLoss;
              return (
                <tr key={i} className="border-b border-jtp-borderSubtle last:border-0 hover:bg-jtp-raised">
                  <td className="px-3 py-2 font-mono text-jtp-textMuted">
                    {new Date(t.exitDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 font-semibold text-jtp-text">{t.asset}</td>
                  <td className={`px-3 py-2 font-medium ${isBuy ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                    {isBuy ? 'Long' : 'Short'}
                  </td>
                  <td className="px-3 py-2 font-mono text-jtp-textMuted">
                    {t.entryPrice.toFixed(5)}
                  </td>
                  <td className="px-3 py-2 font-mono text-jtp-textMuted">
                    {t.exitPrice.toFixed(5)}
                  </td>
                  <td className={`px-3 py-2 font-mono font-medium ${pl == null ? 'text-jtp-textFaint' : pl > 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                    {pl != null ? `${pl > 0 ? '+' : ''}$${pl.toFixed(2)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {parsedTrades.length > 60 && (
          <p className="px-3 py-2 text-jtp-xs text-jtp-textFaint text-center">
            … and {parsedTrades.length - 60} more trades
          </p>
        )}
      </div>

      {/* Playbook selector */}
      <div>
        <label htmlFor="review-playbook" className="block text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim mb-1.5">
          Assign to playbook
        </label>
        <select
          id="review-playbook"
          value={selectedPlaybookId}
          onChange={e => setSelectedPlaybookId(e.target.value)}
          disabled={playbooks.length === 0}
          className="w-full px-3 py-[9px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors disabled:opacity-50"
        >
          {playbooks.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-jtp-border">
        <Button variant="secondary" onClick={() => reset('upload')} className="w-auto">
          Back
        </Button>
        <Button
          onClick={handleConfirmImport}
          disabled={!selectedPlaybookId}
          className="w-auto"
        >
          Import {parsedTrades.length} trades
        </Button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <Spinner />
      <p className="mt-4 text-jtp-sm text-jtp-textMuted">
        Importing trades… this may take a moment.
      </p>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <CheckCircleIcon className="w-14 h-14 text-jtp-profit mb-4" />
      <p className="text-jtp-xl font-semibold text-jtp-text mb-1">Import complete</p>
      <p className="text-jtp-sm text-jtp-textMuted">
        {successResult.imported} trades imported successfully.
        {successResult.skipped > 0 && ` ${successResult.skipped} duplicates skipped.`}
      </p>
      <Button onClick={onClose} className="w-auto mt-6">
        Done
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-4 py-8">
      <p className="text-jtp-lg font-semibold text-jtp-loss">Import failed</p>
      <p className="text-jtp-sm text-jtp-textMuted bg-jtp-raised border border-jtp-border rounded-jtp-xl px-4 py-3">
        {error}
      </p>
      <Button onClick={() => reset('upload')} className="w-auto mx-auto">
        Try again
      </Button>
    </div>
  );

  const renderContent = () => {
    switch (stage) {
      case 'upload':  return renderUpload();
      case 'mapping': return renderMapping();
      case 'review':  return renderReview();
      case 'loading': return renderLoading();
      case 'success': return renderSuccess();
      case 'error':   return renderError();
    }
  };

  return (
    <Modal title={`Import Trades — ${account.name}`} onClose={onClose} size="xl">
      {renderContent()}
    </Modal>
  );
};

export default ImportTradesModal;
