import React, { useState, useMemo } from 'react';
import { Trade, TradeResult } from '../../types';
import { useTrade } from '../../context/TradeContext';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import ImageUploader from './ImageUploader';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import Textarea from '../ui/Textarea';

interface EditTradeFormProps {
  tradeToEdit: Trade;
  onSuccess: () => void;
}

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const parseRRRatio = (input: string): number | null => {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (trimmed === '') return null;

    if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0) {
            return parts[1] / parts[0];
        }
    }

    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
};


const EditTradeForm: React.FC<EditTradeFormProps> = ({ tradeToEdit, onSuccess }) => {
  const { updateTrade, createOrUpdateJournal } = useTrade();
  
  const [formState, setFormState] = useState({
    // Entry
    entryDate: toDateTimeLocal(tradeToEdit.entryDate),
    asset: tradeToEdit.asset,
    direction: tradeToEdit.direction,
    entryPrice: String(tradeToEdit.entryPrice || ''),
    // Execution
    lotSize: String(tradeToEdit.lotSize || ''),
    riskPercentage: String(tradeToEdit.riskPercentage || ''),
    stopLoss: String(tradeToEdit.stopLoss || ''),
    takeProfit: String(tradeToEdit.takeProfit || ''),
    // Exit
    exitDate: toDateTimeLocal(tradeToEdit.exitDate),
    exitPrice: String(tradeToEdit.exitPrice || ''),
    // Performance
    result: tradeToEdit.result || TradeResult.Breakeven,
    profitLoss: String(tradeToEdit.profitLoss || ''),
    rr: String(tradeToEdit.rr || ''),
    commission: String(tradeToEdit.commission || ''),
    swap: String(tradeToEdit.swap || ''),
    // Images
    screenshotBeforeUrl: tradeToEdit.screenshotBeforeUrl || null,
    screenshotAfterUrl: tradeToEdit.screenshotAfterUrl || null,
  });

  const [journalState, setJournalState] = useState({
    mindsetBefore: tradeToEdit.tradeJournal?.mindsetBefore || '',
    exitReasoning: tradeToEdit.tradeJournal?.exitReasoning || '',
    lessonsLearned: tradeToEdit.tradeJournal?.lessonsLearned || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<string | null>('performance');

  const toggleSection = (sectionKey: string) => {
    setOpenSection(prev => (prev === sectionKey ? null : sectionKey));
  };
  
  const grossPL = useMemo(() => {
    const net = parseFloat(formState.profitLoss) || 0;
    const comm = parseFloat(formState.commission) || 0;
    const sw = parseFloat(formState.swap) || 0;
    return net + comm + sw;
  }, [formState.profitLoss, formState.commission, formState.swap]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (['mindsetBefore', 'exitReasoning', 'lessonsLearned'].includes(name)) {
        setJournalState(prev => ({...prev, [name]: value}));
    } else {
        setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = (field: 'screenshotBeforeUrl' | 'screenshotAfterUrl', dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const payload = {
        entryDate: formState.entryDate ? new Date(formState.entryDate).toISOString() : null,
        exitDate: formState.exitDate ? new Date(formState.exitDate).toISOString() : null,
        direction: formState.direction,
        entryPrice: Number(formState.entryPrice),
        exitPrice: formState.exitPrice ? Number(formState.exitPrice) : null,
        riskPercentage: Number(formState.riskPercentage),
        rr: parseRRRatio(formState.rr),
        profitLoss: formState.profitLoss ? Number(formState.profitLoss) : null,
        result: formState.result,
        screenshotBeforeUrl: formState.screenshotBeforeUrl,
        screenshotAfterUrl: formState.screenshotAfterUrl,
        lotSize: formState.lotSize ? Number(formState.lotSize) : null,
        stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
        takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
        commission: formState.commission ? Number(formState.commission) : null,
        swap: formState.swap ? Number(formState.swap) : null,
    };
    
    try {
      await updateTrade(tradeToEdit.id, payload);

      if (journalState.mindsetBefore || journalState.exitReasoning || journalState.lessonsLearned) {
        await createOrUpdateJournal(tradeToEdit.id, journalState);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const SectionHeader: React.FC<{ title: string; sectionKey: string }> = ({ title, sectionKey }) => (
    <button
      type="button"
      className="w-full flex items-center justify-between py-2"
      onClick={() => toggleSection(sectionKey)}
    >
      <h3 className="text-sm font-orbitron text-photonic-blue/80">{title}</h3>
      <ChevronDownIcon className={`w-5 h-5 text-photonic-blue/80 transition-transform ${openSection === sectionKey ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {/* Left Column */}
        <div className="space-y-2">
          {/* Entry Details */}
          <section>
            <h3 className="text-sm font-orbitron text-photonic-blue/80 mb-2">Entry Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <AuthInput label="Entry Date & Time" id="entryDate" name="entryDate" type="datetime-local" value={formState.entryDate} onChange={handleInputChange} step="1" />
              <AuthInput label="Asset" id="asset" name="asset" value={formState.asset} disabled />
            </div>
             <div className="grid grid-cols-2 gap-4 mt-4">
               <SelectInput label="Direction" id="direction" name="direction" value={formState.direction} onChange={handleInputChange} options={[{ value: 'Buy', label: 'Buy (Long)' }, { value: 'Sell', label: 'Sell (Short)' }]}/>
               <AuthInput label="Entry Price" id="entryPrice" name="entryPrice" type="number" step="any" value={formState.entryPrice} onChange={handleInputChange} />
            </div>
          </section>

          {/* Exit Details */}
          <section className="mt-4">
            <h3 className="text-sm font-orbitron text-photonic-blue/80 mb-2">Exit Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <AuthInput label="Exit Date & Time" id="exitDate" name="exitDate" type="datetime-local" value={formState.exitDate} onChange={handleInputChange} step="1" />
              <AuthInput label="Exit Price" id="exitPrice" name="exitPrice" type="number" step="any" value={formState.exitPrice} onChange={handleInputChange} />
            </div>
             <div className="mt-4">
               <SelectInput label="Result" id="result" name="result" value={formState.result} onChange={handleInputChange} options={[{ value: 'Win', label: 'Win' }, { value: 'Loss', label: 'Loss' }, { value: 'Breakeven', label: 'Breakeven' }]}/>
            </div>
          </section>

          {/* My Journal */}
          <section className="border-t border-photonic-blue/10 mt-4">
            <SectionHeader title="My Journal" sectionKey="journal" />
            {openSection === 'journal' && (
              <div className="animate-fade-in-up space-y-3 pt-2">
                <Textarea
                    label="What did you see and how did you feel before entry?"
                    id="mindsetBefore" name="mindsetBefore"
                    value={journalState.mindsetBefore} onChange={handleInputChange}
                    placeholder="Describe your analysis, the setup, and your emotional state..."
                />
                <Textarea
                    label="Why did you exit where you did?"
                    id="exitReasoning" name="exitReasoning"
                    value={journalState.exitReasoning} onChange={handleInputChange}
                    placeholder="Did you hit your take profit, stop loss, or exit manually? Explain why."
                />
                <Textarea
                    label="What are the key lessons learned from this trade?"
                    id="lessonsLearned" name="lessonsLearned"
                    value={journalState.lessonsLearned} onChange={handleInputChange}
                    placeholder="What went well? What could be improved next time?"
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          {/* Execution Details */}
          <section className="border-t border-photonic-blue/10 lg:border-t-0">
            <SectionHeader title="Execution Details" sectionKey="execution" />
            {openSection === 'execution' && (
              <div className="animate-fade-in-up space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <AuthInput label="Stop Loss" id="stopLoss" name="stopLoss" type="number" step="any" value={formState.stopLoss} onChange={handleInputChange} />
                  <AuthInput label="Take Profit" id="takeProfit" name="takeProfit" type="number" step="any" value={formState.takeProfit} onChange={handleInputChange} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                   <AuthInput label="Lot Size" id="lotSize" name="lotSize" type="number" step="any" value={formState.lotSize} onChange={handleInputChange} />
                   <AuthInput label="Risk (%)" id="riskPercentage" name="riskPercentage" type="number" step="any" value={formState.riskPercentage} onChange={handleInputChange} />
                </div>
              </div>
            )}
          </section>
          
           {/* Performance */}
          <section className="border-t border-photonic-blue/10 mt-4">
             <SectionHeader title="Performance" sectionKey="performance" />
             {openSection === 'performance' && (
              <div className="animate-fade-in-up space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <AuthInput label="Net P/L ($)" id="profitLoss" name="profitLoss" type="number" step="any" value={formState.profitLoss} onChange={handleInputChange} required />
                   <AuthInput label="R:R Ratio" id="rr" name="rr" type="text" placeholder="e.g., 2 or 1:2" value={formState.rr} onChange={handleInputChange} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                   <AuthInput label="Commission ($)" id="commission" name="commission" type="number" step="any" value={formState.commission} onChange={handleInputChange} />
                   <AuthInput label="Swap ($)" id="swap" name="swap" type="number" step="any" value={formState.swap} onChange={handleInputChange} />
                </div>
              </div>
             )}
          </section>

          {/* Trade Images */}
          <section className="border-t border-photonic-blue/10 mt-4">
            <SectionHeader title="Trade Images" sectionKey="images" />
            {openSection === 'images' && (
              <div className="space-y-4 animate-fade-in-up pt-2">
                <ImageUploader label="Before Entry Screenshot" onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)} currentImage={formState.screenshotBeforeUrl} />
                <ImageUploader label="After Exit Screenshot" onImageUpload={(data) => handleImageUpload('screenshotAfterUrl', data)} currentImage={formState.screenshotAfterUrl} />
              </div>
            )}
          </section>
        </div>
      </div>
      
       {/* Footer */}
      <div className="mt-6 pt-6 border-t border-photonic-blue/10">
        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default EditTradeForm;