
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { AnalyzeChartResult, Trade } from '../../types';
import { useTrade } from '../../context/TradeContext';
import Input from '../ui/Input';
import ImageUploader from './ImageUploader';
import Button from '../ui/Button';
import { SparklesIcon } from '../icons/SparklesIcon';
import AutofillModal from './AutofillModal';

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
  const { updateTrade } = useTrade();

  const [formState, setFormState] = useState({
    exitDate: toDateTimeLocal(new Date().toISOString()),
    exitPrice: '',
    profitLoss: '',
    screenshotAfterUrl: tradeToClose.screenshotAfterUrl || null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAutofillModalOpen, setIsAutofillModalOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageUpload = (dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, screenshotAfterUrl: dataUrl }));
  };

  const handleApplyAutofill = (data: AnalyzeChartResult) => {
    const updates: Partial<typeof formState> = {};
    if (data.exitDate) updates.exitDate = toDateTimeLocal(data.exitDate);
    if (data.exitPrice ?? null !== null) updates.exitPrice = String(data.exitPrice);
    if (data.profitLoss ?? null !== null) updates.profitLoss = String(data.profitLoss);
    
    setFormState(prev => ({...prev, ...updates}));
    setIsAutofillModalOpen(false);
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
        screenshotAfterUrl: formState.screenshotAfterUrl,
      };
      
      await updateTrade(tradeToClose.id, tradePayload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal title={`Close Trade: ${tradeToClose.asset}`} onClose={onClose} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-end">
              <Button 
                  type="button" 
                  onClick={() => setIsAutofillModalOpen(true)} 
                  variant="secondary"
                  className="w-full sm:w-auto text-xs py-1.5 px-3 flex items-center justify-center gap-2"
              >
                  <SparklesIcon className="w-4 h-4 text-photonic-blue" />
                  Autofill with AI
              </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                  label="Exit Date & Time"
                  id="exitDate" name="exitDate" type="datetime-local"
                  value={formState.exitDate} onChange={handleInputChange} required step="1"
              />
              <Input
                  label="Exit Price"
                  id="exitPrice" name="exitPrice" type="number" step="any"
                  value={formState.exitPrice} onChange={handleInputChange} required
              />
          </div>
          
          <Input
              label="Net P/L ($)"
              id="profitLoss" name="profitLoss" type="number" step="any"
              value={formState.profitLoss} onChange={handleInputChange} required
          />

          <ImageUploader 
              label="After Exit Screenshot (Optional)"
              onImageUpload={handleImageUpload}
              currentImage={formState.screenshotAfterUrl}
          />

          {/* --- FOOTER --- */}
          <div className="mt-6 pt-6 border-t border-white/10">
            {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
            <Button type="submit" isLoading={isLoading} className="w-full">
              Close Trade
            </Button>
          </div>
        </form>
      </Modal>
      {isAutofillModalOpen && (
        <AutofillModal 
            onClose={() => setIsAutofillModalOpen(false)}
            onApply={handleApplyAutofill}
        />
      )}
    </>
  );
};

export default CloseTradeModal;
