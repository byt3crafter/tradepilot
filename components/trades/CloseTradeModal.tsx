import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Trade, TradeResult } from '../../types';
import { useTrade } from '../../context/TradeContext';
import AuthInput from '../auth/AuthInput';
import ImageUploader from './ImageUploader';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Spinner from '../Spinner';

interface CloseTradeModalProps {
  tradeToClose: Trade;
  onClose: () => void;
}

const toDateTimeLocal = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 19);
};

const CloseTradeModal: React.FC<CloseTradeModalProps> = ({ tradeToClose, onClose }) => {
  const { updateTrade, createOrUpdateJournal } = useTrade();

  const [formState, setFormState] = useState({
    exitDate: toDateTimeLocal(new Date().toISOString()),
    exitPrice: '',
    profitLoss: '',
    rr: '',
    commission: '',
    swap: '',
    screenshotBeforeUrl: tradeToClose.screenshotBeforeUrl || null,
    screenshotAfterUrl: tradeToClose.screenshotAfterUrl || null,
    // Journal Fields
    mindsetBefore: tradeToClose.tradeJournal?.mindsetBefore || '',
    exitReasoning: tradeToClose.tradeJournal?.exitReasoning || '',
    lessonsLearned: tradeToClose.tradeJournal?.lessonsLearned || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExecutionDetailsOpen, setIsExecutionDetailsOpen] = useState(false);

  useEffect(() => {
    // If trade already had commission/swap from edit, pre-fill it
    if(tradeToClose.commission || tradeToClose.swap) {
        setIsExecutionDetailsOpen(true);
        setFormState(prev => ({
            ...prev,
            commission: String(tradeToClose.commission || ''),
            swap: String(tradeToClose.swap || '')
        }));
    }
  }, [tradeToClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageUpload = (field: 'screenshotBeforeUrl' | 'screenshotAfterUrl', dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, [field]: dataUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const tradePayload: Partial<Trade> = {
        exitDate: formState.exitDate ? new Date(formState.exitDate).toISOString() : new Date().toISOString(),
        exitPrice: formState.exitPrice ? Number(formState.exitPrice) : null,
        profitLoss: formState.profitLoss ? Number(formState.profitLoss) : null,
        rr: formState.rr ? Number(formState.rr) : null,
        commission: formState.commission ? Number(formState.commission) : null,
        swap: formState.swap ? Number(formState.swap) : null,
        screenshotBeforeUrl: formState.screenshotBeforeUrl,
        screenshotAfterUrl: formState.screenshotAfterUrl,
      };
      
      await updateTrade(tradeToClose.id, tradePayload);

      if (formState.mindsetBefore || formState.exitReasoning || formState.lessonsLearned) {
          const journalPayload = {
              mindsetBefore: formState.mindsetBefore,
              exitReasoning: formState.exitReasoning,
              lessonsLearned: formState.lessonsLearned,
          };
          await createOrUpdateJournal(tradeToClose.id, journalPayload);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal title={`Close Trade: ${tradeToClose.asset}`} onClose={onClose} size="4xl">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
          {/* --- LEFT COLUMN (Data Entry) --- */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput
                    label="Exit Date & Time"
                    id="exitDate" name="exitDate" type="datetime-local"
                    value={formState.exitDate} onChange={handleInputChange} required step="1"
                />
                <AuthInput
                    label="Exit Price"
                    id="exitPrice" name="exitPrice" type="number" step="any"
                    value={formState.exitPrice} onChange={handleInputChange} required
                />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput
                    label="Net P/L ($)"
                    id="profitLoss" name="profitLoss" type="number" step="any"
                    value={formState.profitLoss} onChange={handleInputChange} required
                />
                <AuthInput
                    label="R:R (Optional)"
                    id="rr" name="rr" type="number" step="any"
                    value={formState.rr} onChange={handleInputChange}
                />
            </div>
            
            <div className="pt-4 border-t border-photonic-blue/10">
              <button
                  type="button"
                  onClick={() => setIsExecutionDetailsOpen(!isExecutionDetailsOpen)}
                  className="w-full flex items-center justify-between text-left"
              >
                  <h3 className="text-sm font-orbitron text-photonic-blue/80">Execution Details (Optional)</h3>
                  <ChevronDownIcon className={`w-5 h-5 text-photonic-blue/80 transition-transform ${isExecutionDetailsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isExecutionDetailsOpen && (
                  <div className="mt-3 grid grid-cols-2 gap-4 animate-fade-in-up">
                      <AuthInput
                          label="Commission ($)"
                          id="commission" name="commission" type="number" step="any"
                          value={formState.commission} onChange={handleInputChange}
                      />
                      <AuthInput
                          label="Swap ($)"
                          id="swap" name="swap" type="number" step="any"
                          value={formState.swap} onChange={handleInputChange}
                      />
                  </div>
              )}
            </div>

            <div className="pt-4 border-t border-photonic-blue/10">
              <h3 className="text-sm font-orbitron text-photonic-blue/80 mb-2">My Journal</h3>
               <div className="space-y-3">
                  <Textarea
                    label="What did you see and how did you feel before entry?"
                    id="mindsetBefore" name="mindsetBefore"
                    value={formState.mindsetBefore} onChange={handleInputChange}
                    placeholder="Describe your analysis, the setup, and your emotional state..."
                  />
                  <Textarea
                    label="Why did you exit where you did?"
                    id="exitReasoning" name="exitReasoning"
                    value={formState.exitReasoning} onChange={handleInputChange}
                    placeholder="Did you hit your take profit, stop loss, or exit manually? Explain why."
                  />
                  <Textarea
                    label="What are the key lessons learned from this trade?"
                    id="lessonsLearned" name="lessonsLearned"
                    value={formState.lessonsLearned} onChange={handleInputChange}
                    placeholder="What went well? What could be improved next time?"
                  />
              </div>
            </div>
          </div>
          {/* --- RIGHT COLUMN (Screenshots) --- */}
          <div className="mt-6 lg:mt-0">
            <h3 className="text-base font-semibold text-future-light mb-2">Trade Images</h3>
            <div className="space-y-4">
              <ImageUploader 
                  label="Before Entry Screenshot"
                  onImageUpload={(data) => handleImageUpload('screenshotBeforeUrl', data)}
                  currentImage={formState.screenshotBeforeUrl}
              />
              <ImageUploader 
                  label="After Exit Screenshot"
                  onImageUpload={(data) => handleImageUpload('screenshotAfterUrl', data)}
                  currentImage={formState.screenshotAfterUrl}
              />
            </div>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="mt-6 pt-6 border-t border-photonic-blue/10">
          {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Spinner /> : 'Close Trade'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CloseTradeModal;