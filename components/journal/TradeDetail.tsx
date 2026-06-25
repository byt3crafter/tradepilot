import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trade, Direction, TradeJournal, Candle } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { usePriceFormatter } from '../../hooks/usePriceFormatter';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { UploadIcon } from '../icons/UploadIcon';
import Spinner from '../Spinner';
import TradeChart from '../charts/TradeChart';
import api from '../../services/api';

// ─── Utilities ────────────────────────────────────────────────────────────────

const toDateTimeLocal = (dateString?: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
};

const fmtPL = (v: number): string =>
  `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;

const fmtR = (v: number | null | undefined): string => {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)} R`;
};

const calcDuration = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '—';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(' ') : '<1m';
};

const fmtDateTime = (d?: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: 'profit' | 'loss' | 'neutral' | 'blue' | 'warning';
}

const colorMap: Record<NonNullable<StatCardProps['color']>, string> = {
  profit:  'text-jtp-profit',
  loss:    'text-jtp-loss',
  neutral: 'text-jtp-text',
  blue:    'text-jtp-blue',
  warning: 'text-jtp-warning',
};

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, color = 'neutral' }) => (
  <div className="flex flex-col gap-1 bg-jtp-raised border border-jtp-border rounded-jtp-panel px-4 py-3 min-w-[110px]">
    <span className="text-jtp-xs-plus uppercase tracking-[0.4px] font-semibold text-jtp-textDim whitespace-nowrap">
      {label}
    </span>
    <span className={`font-mono font-semibold text-jtp-2xl leading-none ${colorMap[color]}`}>
      {value}
    </span>
    {sub && <span className="text-jtp-xs text-jtp-textFaint">{sub}</span>}
  </div>
);

// ─── Confidence pip display ────────────────────────────────────────────────────

const ConfidencePips: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i <= v ? 'bg-jtp-blue' : 'bg-jtp-borderStrong'
          }`}
        />
      ))}
      {value != null && (
        <span className="ml-1 font-mono text-jtp-base-minus text-jtp-textSoft">{value}/5</span>
      )}
    </div>
  );
};

// ─── Confidence pip editor ─────────────────────────────────────────────────────

const ConfidenceEditor: React.FC<{
  value: number | null;
  onChange: (v: number | null) => void;
}> = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5">
    {[1, 2, 3, 4, 5].map(i => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(value === i ? null : i)}
        className={`w-7 h-7 rounded-full border text-jtp-xs font-semibold transition-colors ${
          value != null && i <= value
            ? 'bg-jtp-blue border-jtp-blue text-white'
            : 'bg-jtp-control border-jtp-borderStrong text-jtp-textMuted hover:border-jtp-blue/50'
        }`}
      >
        {i}
      </button>
    ))}
  </div>
);

// ─── Inline screenshot uploader ───────────────────────────────────────────────

interface InlineImageUploaderProps {
  label: string;
  currentImage?: string | null;
  editMode: boolean;
  onChange?: (base64: string | null) => void;
  onEnlarge: (url: string) => void;
}

const InlineImageUploader: React.FC<InlineImageUploaderProps> = ({
  label,
  currentImage,
  editMode,
  onChange,
  onEnlarge,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange?.(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!editMode) return;
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.startsWith('image/')) {
        const f = e.clipboardData.items[i].getAsFile();
        if (f) { processFile(f); e.preventDefault(); break; }
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-jtp-xs font-semibold uppercase tracking-[0.4px] text-jtp-textDim">
        {label}
      </span>

      {currentImage ? (
        <div className="relative group">
          <img
            src={currentImage}
            alt={label}
            className="w-full rounded-jtp-panel border border-jtp-border object-cover max-h-[320px] cursor-zoom-in"
            onClick={() => onEnlarge(currentImage)}
          />
          {editMode && (
            <button
              type="button"
              onClick={() => onChange?.(null)}
              className="absolute top-2 right-2 p-1.5 bg-jtp-loss/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove screenshot"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : editMode ? (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 h-36 rounded-jtp-panel border-2 border-dashed border-jtp-borderStrong hover:border-jtp-blue/40 cursor-pointer transition-colors text-jtp-textFaint"
        >
          <UploadIcon className="w-6 h-6" />
          <span className="text-jtp-xs">Click to browse or paste image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            ref={fileInputRef}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-28 rounded-jtp-panel border border-jtp-border bg-jtp-raised text-jtp-textFaint text-jtp-xs">
          Not provided
        </div>
      )}
    </div>
  );
};

// ─── Mistake tag editor ────────────────────────────────────────────────────────

interface MistakeTagEditorProps {
  tags: string[];
  allSuggestions: string[];
  editMode: boolean;
  onChange: (tags: string[]) => void;
}

const MistakeTagEditor: React.FC<MistakeTagEditorProps> = ({
  tags,
  allSuggestions,
  editMode,
  onChange,
}) => {
  const [input, setInput] = useState('');

  const filtered = useMemo(
    () =>
      allSuggestions
        .filter(s => !tags.includes(s) && (input === '' || s.toLowerCase().includes(input.toLowerCase())))
        .slice(0, 6),
    [allSuggestions, tags, input],
  );

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tags.includes(t)) { setInput(''); return; }
    onChange([...tags, t]);
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && !editMode && (
          <span className="text-jtp-xs text-jtp-textFaint">None recorded</span>
        )}
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-jtp-xs px-2 py-1 rounded-jtp-md bg-jtp-loss/10 text-jtp-lossSoft"
          >
            {tag}
            {editMode && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-jtp-loss transition-colors leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {editMode && (
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
                e.preventDefault();
                addTag(input);
              }
            }}
            placeholder="Add mistake tag… (Enter to add)"
            className="w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-[7px] text-jtp-base-minus text-jtp-text placeholder:text-jtp-textFaint outline-none focus:border-jtp-blue transition-colors"
          />
          {filtered.length > 0 && input.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 z-10 bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel shadow-lg">
              {filtered.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="w-full text-left px-3 py-2 text-jtp-base-minus text-jtp-textSoft hover:bg-jtp-active hover:text-jtp-text transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Checklist display ────────────────────────────────────────────────────────

interface ChecklistDisplayProps {
  items: { label: string; checked: boolean }[];
  editMode: boolean;
  onChange: (items: { label: string; checked: boolean }[]) => void;
}

const ChecklistDisplay: React.FC<ChecklistDisplayProps> = ({ items, editMode, onChange }) => {
  if (items.length === 0) {
    return (
      <span className="text-jtp-xs text-jtp-textFaint">No pre-trade checklist captured.</span>
    );
  }

  const checkedCount = items.filter(i => i.checked).length;
  const pct = Math.round((checkedCount / items.length) * 100);

  const toggleItem = (idx: number) => {
    if (!editMode) return;
    const next = items.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item,
    );
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-jtp-borderStrong rounded-full overflow-hidden">
          <div
            className="h-full bg-jtp-profit rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-mono text-jtp-base-minus font-semibold ${pct === 100 ? 'text-jtp-profit' : 'text-jtp-warning'}`}>
          {pct}%
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => toggleItem(idx)}
            disabled={!editMode}
            className={`flex items-center gap-2.5 text-left w-full rounded-jtp-md px-2 py-1.5 transition-colors ${
              editMode ? 'hover:bg-jtp-active cursor-pointer' : 'cursor-default'
            }`}
          >
            <span
              className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[9px] font-bold transition-colors ${
                item.checked
                  ? 'bg-jtp-profit border-jtp-profit text-white'
                  : 'border-jtp-borderStrong text-transparent'
              }`}
            >
              ✓
            </span>
            <span className={`text-jtp-base-minus ${item.checked ? 'text-jtp-text' : 'text-jtp-textMuted line-through decoration-jtp-textFaint'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <div className={`bg-jtp-panel border border-jtp-border rounded-jtp-panel ${className}`}>
    <div className="px-5 py-3 border-b border-jtp-border">
      <span className="text-jtp-xs-plus font-semibold uppercase tracking-[0.4px] text-jtp-textDim">
        {title}
      </span>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

// ─── Editable field ───────────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string;
  value: string;
  editMode: boolean;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  editMode,
  onChange,
  type = 'text',
  placeholder = '',
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim">
      {label}
    </span>
    {editMode ? (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-[7px] font-mono text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
        style={type === 'datetime-local' ? { colorScheme: 'dark' } : undefined}
      />
    ) : (
      <span className="font-mono text-jtp-base-minus text-jtp-textSoft">{value || '—'}</span>
    )}
  </div>
);

// ─── Editable textarea ────────────────────────────────────────────────────────

interface EditableTextareaProps {
  label: string;
  value: string;
  editMode: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

const EditableTextarea: React.FC<EditableTextareaProps> = ({
  label,
  value,
  editMode,
  onChange,
  placeholder = '',
  rows = 3,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim">
      {label}
    </span>
    {editMode ? (
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-2 text-jtp-base-minus text-jtp-text placeholder:text-jtp-textFaint outline-none focus:border-jtp-blue transition-colors resize-none w-full"
      />
    ) : (
      <p className="text-jtp-base-minus text-jtp-textSoft whitespace-pre-wrap leading-relaxed">
        {value || <span className="text-jtp-textFaint">—</span>}
      </p>
    )}
  </div>
);

// ─── Main TradeDetail component ───────────────────────────────────────────────

interface TradeDetailProps {
  trade: Trade;
  initialEditMode?: boolean;
  onBack: () => void;
}

const TradeDetail: React.FC<TradeDetailProps> = ({ trade, initialEditMode = false, onBack }) => {
  const { updateTrade, deleteTrade, createOrUpdateJournal, closedTrades } = useTrade();
  const { playbooks } = usePlaybook();
  const { activeAccount } = useAccount();
  const { accessToken } = useAuth();
  const { formatPrice } = usePriceFormatter(trade.asset);

  // ── Edit / save state ──────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(initialEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Lightbox ───────────────────────────────────────────────────────────────
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── Chart state ────────────────────────────────────────────────────────────
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartNote, setChartNote] = useState<string | undefined>(undefined);
  const [chartEmpty, setChartEmpty] = useState(false);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Editable form state ────────────────────────────────────────────────────
  const [entryPrice, setEntryPrice] = useState(trade.entryPrice?.toString() ?? '');
  const [exitPrice, setExitPrice] = useState(trade.exitPrice?.toString() ?? '');
  const [entryDate, setEntryDate] = useState(toDateTimeLocal(trade.entryDate));
  const [exitDate, setExitDate] = useState(toDateTimeLocal(trade.exitDate));
  const [lotSize, setLotSize] = useState(trade.lotSize?.toString() ?? '');
  const [stopLoss, setStopLoss] = useState(trade.stopLoss?.toString() ?? '');
  const [takeProfit, setTakeProfit] = useState(trade.takeProfit?.toString() ?? '');
  const [riskPercentage, setRiskPercentage] = useState(trade.riskPercentage?.toString() ?? '');
  const [commission, setCommission] = useState(trade.commission?.toString() ?? '');
  const [swap, setSwap] = useState(trade.swap?.toString() ?? '');
  const [mae, setMae] = useState(trade.mae?.toString() ?? '');
  const [mfe, setMfe] = useState(trade.mfe?.toString() ?? '');
  const [confidence, setConfidence] = useState<number | null>(trade.confidence ?? null);
  const [mistakeTags, setMistakeTags] = useState<string[]>(trade.mistakeTags ?? []);
  const [playbookId, setPlaybookId] = useState(trade.playbookId ?? '');
  const [playbookSetupId, setPlaybookSetupId] = useState(trade.playbookSetupId ?? '');
  const [screenshotBefore, setScreenshotBefore] = useState<string | null>(
    trade.screenshotBeforeUrl ?? null,
  );
  const [screenshotAfter, setScreenshotAfter] = useState<string | null>(
    trade.screenshotAfterUrl ?? null,
  );
  const [preTradeChecklist, setPreTradeChecklist] = useState<{ label: string; checked: boolean }[]>(
    trade.preTradeChecklistState ?? [],
  );

  // ── Journal state ──────────────────────────────────────────────────────────
  const [mindsetBefore, setMindsetBefore] = useState(trade.tradeJournal?.mindsetBefore ?? '');
  const [exitReasoning, setExitReasoning] = useState(trade.tradeJournal?.exitReasoning ?? '');
  const [lessonsLearned, setLessonsLearned] = useState(trade.tradeJournal?.lessonsLearned ?? '');

  // ── Computed ───────────────────────────────────────────────────────────────
  const isBuy = trade.direction === Direction.Buy;
  const netPL = (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0);
  const netPLColor: StatCardProps['color'] = netPL > 0 ? 'profit' : netPL < 0 ? 'loss' : 'neutral';
  const realisedRColor: StatCardProps['color'] =
    (trade.realisedR ?? 0) > 0 ? 'profit' : (trade.realisedR ?? 0) < 0 ? 'loss' : 'neutral';

  const setupName = useMemo(() => {
    if (!playbookId) return '—';
    const pb = playbooks.find(p => p.id === playbookId);
    if (!pb) return '—';
    if (playbookSetupId) {
      const setup = pb.setups?.find(s => s.id === playbookSetupId);
      if (setup) return setup.name;
    }
    return pb.name;
  }, [playbookId, playbookSetupId, playbooks]);

  const availableSetups = useMemo(() => {
    const pb = playbooks.find(p => p.id === playbookId);
    return pb?.setups ?? [];
  }, [playbooks, playbookId]);

  const allMistakeSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const t of closedTrades) {
      for (const tag of t.mistakeTags ?? []) {
        if (!seen.has(tag)) { seen.add(tag); result.push(tag); }
      }
    }
    return result;
  }, [closedTrades]);

  const duration = calcDuration(trade.entryDate, trade.exitDate);

  const adherencePct = useMemo(() => {
    const items: { label: string; checked: boolean }[] = preTradeChecklist;
    if (!items.length) return null;
    const pct = Math.round((items.filter(i => i.checked).length / items.length) * 100);
    return pct;
  }, [preTradeChecklist]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCancelEdit = () => {
    // Reset all editable fields back to trade values
    setEntryPrice(trade.entryPrice?.toString() ?? '');
    setExitPrice(trade.exitPrice?.toString() ?? '');
    setEntryDate(toDateTimeLocal(trade.entryDate));
    setExitDate(toDateTimeLocal(trade.exitDate));
    setLotSize(trade.lotSize?.toString() ?? '');
    setStopLoss(trade.stopLoss?.toString() ?? '');
    setTakeProfit(trade.takeProfit?.toString() ?? '');
    setRiskPercentage(trade.riskPercentage?.toString() ?? '');
    setCommission(trade.commission?.toString() ?? '');
    setSwap(trade.swap?.toString() ?? '');
    setMae(trade.mae?.toString() ?? '');
    setMfe(trade.mfe?.toString() ?? '');
    setConfidence(trade.confidence ?? null);
    setMistakeTags(trade.mistakeTags ?? []);
    setPlaybookId(trade.playbookId ?? '');
    setPlaybookSetupId(trade.playbookSetupId ?? '');
    setScreenshotBefore(trade.screenshotBeforeUrl ?? null);
    setScreenshotAfter(trade.screenshotAfterUrl ?? null);
    setPreTradeChecklist(trade.preTradeChecklistState ?? []);
    setMindsetBefore(trade.tradeJournal?.mindsetBefore ?? '');
    setExitReasoning(trade.tradeJournal?.exitReasoning ?? '');
    setLessonsLearned(trade.tradeJournal?.lessonsLearned ?? '');
    setSaveError('');
    setEditMode(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      await updateTrade(trade.id, {
        entryPrice: entryPrice ? Number(entryPrice) : undefined,
        exitPrice: exitPrice ? Number(exitPrice) : null,
        entryDate: entryDate ? new Date(entryDate).toISOString() : undefined,
        exitDate: exitDate ? new Date(exitDate).toISOString() : null,
        lotSize: lotSize ? Number(lotSize) : null,
        stopLoss: stopLoss ? Number(stopLoss) : null,
        takeProfit: takeProfit ? Number(takeProfit) : null,
        riskPercentage: riskPercentage ? Number(riskPercentage) : undefined,
        commission: commission ? Number(commission) : null,
        swap: swap ? Number(swap) : null,
        mae: mae ? Number(mae) : null,
        mfe: mfe ? Number(mfe) : null,
        confidence: confidence ?? undefined,
        mistakeTags,
        playbookId: playbookId || undefined,
        playbookSetupId: playbookSetupId || null,
        screenshotBeforeUrl: screenshotBefore,
        screenshotAfterUrl: screenshotAfter,
        preTradeChecklistState: preTradeChecklist.length > 0 ? preTradeChecklist : undefined,
      });

      // Save journal if any note has content
      const hasJournal = mindsetBefore || exitReasoning || lessonsLearned;
      if (hasJournal) {
        await createOrUpdateJournal(trade.id, { mindsetBefore, exitReasoning, lessonsLearned });
      }

      setEditMode(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || err?.message || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrade(trade.id);
      onBack();
    } catch {
      setIsDeleting(false);
      setIsDeleteConfirming(false);
    }
  };

  // ── Chart: interval/window logic + fetch ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const toApiDate = (ms: number): string => {
      const d = new Date(ms);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };

    async function fetchCandles() {
      if (!trade.entryDate) return;

      setChartLoading(true);
      setChartEmpty(false);
      setChartCandles([]);

      const entryMs = new Date(trade.entryDate).getTime();
      const exitMs = trade.exitDate ? new Date(trade.exitDate).getTime() : null;

      let interval: string;
      let startMs: number;
      let endMs: number;

      if (exitMs != null) {
        const durationMs = Math.max(exitMs - entryMs, 0);
        if (durationMs < 6 * 3600 * 1000) interval = '5min';
        else if (durationMs < 2 * 86400 * 1000) interval = '15min';
        else if (durationMs < 10 * 86400 * 1000) interval = '1h';
        else if (durationMs < 60 * 86400 * 1000) interval = '4h';
        else interval = '1day';

        const padding = durationMs * 0.4;
        startMs = entryMs - padding;
        endMs = exitMs + padding;
      } else {
        interval = '1h';
        startMs = entryMs - 2 * 86400 * 1000;
        endMs = entryMs + 2 * 86400 * 1000;
      }

      try {
        const res = await api.getCandles(
          trade.asset,
          interval,
          toApiDate(startMs),
          toApiDate(endMs),
          accessToken,
        );
        if (!cancelled) {
          setChartCandles(res.candles);
          setChartNote(res.note);
          setChartEmpty(res.candles.length === 0);
        }
      } catch {
        if (!cancelled) {
          setChartCandles([]);
          setChartEmpty(true);
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    fetchCandles();
    return () => { cancelled = true; };
  }, [trade.id, trade.entryDate, trade.exitDate, trade.asset, accessToken]);

  // Chart trade markers
  const chartTrades = useMemo(() => {
    const markers: { time: number; price: number; side: 'Buy' | 'Sell'; type: 'Entry' | 'Exit' }[] = [];
    const side = trade.direction === Direction.Buy ? 'Buy' as const : 'Sell' as const;
    if (trade.entryDate && trade.entryPrice != null) {
      markers.push({
        time: Math.floor(new Date(trade.entryDate).getTime() / 1000),
        price: trade.entryPrice,
        side,
        type: 'Entry',
      });
    }
    if (trade.exitDate && trade.exitPrice != null) {
      markers.push({
        time: Math.floor(new Date(trade.exitDate).getTime() / 1000),
        price: trade.exitPrice,
        side,
        type: 'Exit',
      });
    }
    return markers;
  }, [trade.entryDate, trade.exitDate, trade.entryPrice, trade.exitPrice, trade.direction]);

  // ── Date display ───────────────────────────────────────────────────────────
  const dateDisplay = fmtDateTime(trade.exitDate || trade.entryDate);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-5 animate-jtp-fade-in">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: back + identity */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-jtp-textMuted hover:text-jtp-text text-jtp-base transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="w-px h-5 bg-jtp-borderStrong flex-shrink-0" />

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-semibold text-jtp-2xl text-jtp-text">{trade.asset}</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-jtp-md text-jtp-xs font-semibold ${
                  isBuy
                    ? 'bg-jtp-profit/10 text-jtp-profit'
                    : 'bg-jtp-loss/10 text-jtp-loss'
                }`}
              >
                <span className="text-[8px]">{isBuy ? '▲' : '▼'}</span>
                {isBuy ? 'Long' : 'Short'}
              </span>
              {trade.result && (
                <span
                  className={`px-2.5 py-1 rounded-jtp-md text-jtp-xs font-semibold ${
                    trade.result === 'Win'
                      ? 'bg-jtp-profit/10 text-jtp-profit'
                      : trade.result === 'Loss'
                      ? 'bg-jtp-loss/10 text-jtp-loss'
                      : 'bg-jtp-border text-jtp-textMuted'
                  }`}
                >
                  {trade.result}
                </span>
              )}
              <span className="text-jtp-base-minus text-jtp-textFaint font-mono">{dateDisplay}</span>
            </div>
          </div>

          {/* Right: edit/save + delete */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {editMode ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textSoft text-jtp-base-minus font-medium hover:border-jtp-borderHover transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-jtp-blue hover:bg-jtp-blueHover rounded-jtp-xl text-white text-jtp-base-minus font-semibold transition-colors disabled:opacity-60"
                >
                  {isSaving ? <Spinner /> : null}
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textSoft text-jtp-base-minus font-medium hover:border-jtp-borderHover transition-colors"
              >
                <PencilIcon className="w-3.5 h-3.5" />
                Edit
              </button>
            )}

            {isDeleteConfirming ? (
              <div className="flex items-center gap-1.5">
                <span className="text-jtp-xs text-jtp-loss">Sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1 px-3 py-1.5 bg-jtp-loss/10 border border-jtp-loss/30 rounded-jtp-xl text-jtp-loss text-jtp-xs font-semibold hover:bg-jtp-loss/20 transition-colors"
                >
                  {isDeleting ? <Spinner /> : <TrashIcon className="w-3.5 h-3.5" />}
                  Confirm
                </button>
                <button
                  onClick={() => setIsDeleteConfirming(false)}
                  className="px-3 py-1.5 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textMuted text-jtp-xs hover:border-jtp-borderHover transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsDeleteConfirming(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-jtp-textDim hover:text-jtp-loss transition-colors rounded-jtp-xl hover:bg-jtp-loss/10"
                title="Delete trade"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {saveError && (
          <div className="px-4 py-2 rounded-jtp-xl bg-jtp-loss/10 border border-jtp-loss/20 text-jtp-loss text-jtp-xs">
            {saveError}
          </div>
        )}

        {/* ── Stat cards row ──────────────────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="Net P&L"
            value={fmtPL(netPL)}
            color={netPLColor}
            sub="after fees"
          />
          <StatCard
            label="Real R"
            value={fmtR(trade.realisedR)}
            color={realisedRColor}
          />
          <StatCard
            label="Plan R"
            value={trade.planR != null ? `${trade.planR.toFixed(2)} R` : '—'}
            color="neutral"
          />
          <StatCard
            label="Entry"
            value={formatPrice(trade.entryPrice)}
            color="neutral"
          />
          <StatCard
            label="Exit"
            value={formatPrice(trade.exitPrice)}
            color="neutral"
          />
          <StatCard
            label="Size"
            value={trade.lotSize != null ? `${trade.lotSize} lot` : '—'}
            color="neutral"
          />
          <StatCard
            label="Duration"
            value={duration}
            color="neutral"
          />
          <StatCard
            label="MAE"
            value={trade.mae != null ? formatPrice(trade.mae) : '—'}
            color={trade.mae != null ? 'loss' : 'neutral'}
            sub="max adverse"
          />
          <StatCard
            label="MFE"
            value={trade.mfe != null ? formatPrice(trade.mfe) : '—'}
            color={trade.mfe != null ? 'profit' : 'neutral'}
            sub="max favourable"
          />
          <StatCard
            label="Confidence"
            value={
              trade.confidence != null ? (
                <span className="text-jtp-blue">{trade.confidence}/5</span>
              ) : (
                '—'
              )
            }
            color="neutral"
          />
          <StatCard
            label="Commission"
            value={trade.commission ? `-$${trade.commission.toFixed(2)}` : '—'}
            color={trade.commission ? 'loss' : 'neutral'}
          />
          <StatCard
            label="Swap"
            value={trade.swap ? `-$${trade.swap.toFixed(2)}` : '—'}
            color={trade.swap ? 'loss' : 'neutral'}
          />
          <StatCard
            label="Risk %"
            value={trade.riskPercentage != null ? `${trade.riskPercentage.toFixed(2)}%` : '—'}
            color="neutral"
          />
          <StatCard
            label="Setup"
            value={<span className="text-jtp-base-minus">{setupName}</span>}
            color="neutral"
          />
          {adherencePct != null && (
            <StatCard
              label="Adherence"
              value={`${adherencePct}%`}
              color={adherencePct === 100 ? 'profit' : adherencePct >= 60 ? 'warning' : 'loss'}
            />
          )}
        </div>

        {/* ── Price Chart ─────────────────────────────────────────────────── */}
        <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-jtp-border">
            <span className="text-jtp-xs-plus font-semibold uppercase tracking-[0.4px] text-jtp-textDim">
              Price Chart
            </span>
          </div>
          <div className="px-5 py-4">
            {chartLoading ? (
              <div className="flex items-center justify-center" style={{ height: 320 }}>
                <Spinner />
              </div>
            ) : chartEmpty ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ height: 320 }}>
                <span className="text-jtp-textDim text-jtp-base-minus">
                  Price chart unavailable for {trade.asset}.
                </span>
                {chartNote && /key|plan|limit|coverage|demo/i.test(chartNote) && (
                  <span className="text-jtp-textFaint text-jtp-xs">
                    Add a market-data API key for full symbol coverage.
                  </span>
                )}
              </div>
            ) : (
              <div style={{ height: 320 }}>
                <TradeChart
                  candles={chartCandles}
                  trades={chartTrades}
                  result={trade.result}
                  direction={trade.direction}
                  entryPrice={trade.entryPrice}
                  stopLoss={trade.stopLoss}
                  takeProfit={trade.takeProfit}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Two-column body ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Left column */}
          <div className="flex flex-col gap-5">

            {/* Screenshots */}
            <Section title="Screenshots">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InlineImageUploader
                  label="Before Entry"
                  currentImage={screenshotBefore}
                  editMode={editMode}
                  onChange={setScreenshotBefore}
                  onEnlarge={setLightboxUrl}
                />
                <InlineImageUploader
                  label="After Exit"
                  currentImage={screenshotAfter}
                  editMode={editMode}
                  onChange={setScreenshotAfter}
                  onEnlarge={setLightboxUrl}
                />
              </div>
            </Section>

            {/* Trade execution fields */}
            <Section title="Execution Details">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
                <EditableField label="Entry Price" value={entryPrice} editMode={editMode} onChange={setEntryPrice} type="number" />
                <EditableField label="Exit Price"  value={exitPrice}  editMode={editMode} onChange={setExitPrice}  type="number" />
                <EditableField label="Entry Date"  value={entryDate}  editMode={editMode} onChange={setEntryDate}  type="datetime-local" />
                <EditableField label="Exit Date"   value={exitDate}   editMode={editMode} onChange={setExitDate}   type="datetime-local" />
                <EditableField label="Lot Size"    value={lotSize}    editMode={editMode} onChange={setLotSize}    type="number" />
                <EditableField label="Stop Loss"   value={stopLoss}   editMode={editMode} onChange={setStopLoss}   type="number" />
                <EditableField label="Take Profit" value={takeProfit} editMode={editMode} onChange={setTakeProfit} type="number" />
                <EditableField label="Risk %"      value={riskPercentage} editMode={editMode} onChange={setRiskPercentage} type="number" />
                <EditableField label="Commission"  value={commission} editMode={editMode} onChange={setCommission} type="number" />
                <EditableField label="Swap"        value={swap}       editMode={editMode} onChange={setSwap}       type="number" />
              </div>
            </Section>

            {/* Playbook / Setup selector */}
            <Section title="Playbook & Setup">
              {editMode ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim mb-1.5">Playbook</label>
                    <select
                      value={playbookId}
                      onChange={e => { setPlaybookId(e.target.value); setPlaybookSetupId(''); }}
                      className="w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-[7px] text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
                    >
                      <option value="">— None —</option>
                      {playbooks.map(pb => (
                        <option key={pb.id} value={pb.id}>{pb.name}</option>
                      ))}
                    </select>
                  </div>
                  {availableSetups.length > 0 && (
                    <div>
                      <label className="block text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim mb-1.5">Setup</label>
                      <select
                        value={playbookSetupId}
                        onChange={e => setPlaybookSetupId(e.target.value)}
                        className="w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-[7px] text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue transition-colors"
                      >
                        <option value="">— None —</option>
                        {availableSetups.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim mb-1">Playbook</div>
                    <div className="font-mono text-jtp-base-minus text-jtp-textSoft">
                      {playbooks.find(p => p.id === playbookId)?.name ?? '—'}
                    </div>
                  </div>
                  {playbookSetupId && (
                    <div>
                      <div className="text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim mb-1">Setup</div>
                      <div className="font-mono text-jtp-base-minus text-jtp-textSoft">{setupName}</div>
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">

            {/* MAE / MFE + Confidence */}
            <Section title="Trade Quality">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <EditableField label="MAE (Max Adverse Excursion)" value={mae} editMode={editMode} onChange={setMae} type="number" placeholder="0.00000" />
                <EditableField label="MFE (Max Favourable Excursion)" value={mfe} editMode={editMode} onChange={setMfe} type="number" placeholder="0.00000" />
                <div className="flex flex-col gap-1.5 col-span-full">
                  <span className="text-jtp-xs uppercase tracking-[0.4px] font-semibold text-jtp-textDim">Confidence</span>
                  {editMode ? (
                    <ConfidenceEditor value={confidence} onChange={setConfidence} />
                  ) : (
                    <ConfidencePips value={confidence} />
                  )}
                </div>
              </div>
            </Section>

            {/* Mistake tags */}
            <Section title="Mistake Tags">
              <MistakeTagEditor
                tags={mistakeTags}
                allSuggestions={allMistakeSuggestions}
                editMode={editMode}
                onChange={setMistakeTags}
              />
            </Section>

            {/* Pre-trade checklist */}
            <Section title="Pre-Trade Checklist">
              <ChecklistDisplay
                items={preTradeChecklist}
                editMode={editMode}
                onChange={setPreTradeChecklist}
              />
            </Section>

            {/* Journal notes */}
            <Section title="Journal Notes">
              <div className="flex flex-col gap-4">
                <EditableTextarea
                  label="Mindset Before Entry"
                  value={mindsetBefore}
                  editMode={editMode}
                  onChange={setMindsetBefore}
                  placeholder="Describe your analysis, the setup, and your emotional state…"
                  rows={3}
                />
                <EditableTextarea
                  label="Exit Reasoning"
                  value={exitReasoning}
                  editMode={editMode}
                  onChange={setExitReasoning}
                  placeholder="Why did you exit where you did?"
                  rows={3}
                />
                <EditableTextarea
                  label="Lessons Learned"
                  value={lessonsLearned}
                  editMode={editMode}
                  onChange={setLessonsLearned}
                  placeholder="What went well? What could be improved next time?"
                  rows={3}
                />
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-jtp-panel border border-jtp-borderStrong rounded-full text-jtp-textMuted hover:text-jtp-text z-10"
              aria-label="Close"
            >
              <XIcon className="w-4 h-4" />
            </button>
            <img
              src={lightboxUrl}
              alt="Screenshot enlarged"
              className="w-full rounded-jtp-panel border border-jtp-border max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TradeDetail;
