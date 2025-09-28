import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Trade } from '../../types';
import { useTrade } from '../../context/TradeContext';
import AuthInput from '../auth/AuthInput';
import ImageUploader from './ImageUploader';
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
  const { updateTrade } = useTrade();

  const [formState, setFormState] = useState({
    exitDate: toDateTimeLocal(new Date().toISOString()),
    exitPrice: '',
    profitLoss: '',
    screenshotAfterUrl: tradeToClose.screenshotAfterUrl || null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageUpload = (dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, screenshotAfterUrl: dataUrl }));
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
    <Modal title={`Close Trade: ${tradeToClose.asset}`} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
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
        
        <AuthInput
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