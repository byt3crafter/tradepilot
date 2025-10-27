import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import { Analysis, IncomeCategory, AssetClass, MarketVenue, Direction, ReviewCycle } from '../../types';
import { useAnalysis } from '../../context/AnalysisContext';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import Textarea from '../ui/Textarea';
import { UploadIcon } from '../icons/UploadIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface AddAnalysisModalProps {
  analysisToEdit: Analysis | null;
  onClose: () => void;
}

const toInputDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
};

const AddAnalysisModal: React.FC<AddAnalysisModalProps> = ({ analysisToEdit, onClose }) => {
  const { createAnalysis, updateAnalysis } = useAnalysis();
  const isEditMode = !!analysisToEdit;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    symbol: analysisToEdit?.symbol || '',
    category: analysisToEdit?.category || IncomeCategory.DAILY_INCOME,
    assetClass: analysisToEdit?.assetClass || AssetClass.FOREX,
    marketVenue: analysisToEdit?.marketVenue || MarketVenue.SPOT,
    directionalBias: analysisToEdit?.directionalBias || Direction.Buy,
    htf: analysisToEdit?.htf || '',
    ltf: analysisToEdit?.ltf?.join(', ') || '',
    reviewCycle: analysisToEdit?.reviewCycle || ReviewCycle.DAILY,
    // FIX: Convert Date object to string before passing to toInputDate
    nextReviewAt: toInputDate(analysisToEdit?.nextReviewAt?.toString() || new Date().toISOString()),
    structureNotes: analysisToEdit?.structureNotes || '',
  });
  
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>(analysisToEdit?.screenshotUrls || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setScreenshotUrls(prev => [...prev, base64String]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
        const file = e.clipboardData.items[i].getAsFile();
        if (file) processFile(file);
        e.preventDefault();
        break;
      }
    }
  };
  
  const handleRemoveImage = (indexToRemove: number) => {
    setScreenshotUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const payload = {
      ...formState,
      screenshotUrls,
      ltf: formState.ltf.split(',').map(item => item.trim()).filter(Boolean),
      nextReviewAt: new Date(formState.nextReviewAt).toISOString(),
    };

    try {
      if (isEditMode) {
        await updateAnalysis(analysisToEdit.id, payload as any);
      } else {
        await createAnalysis(payload as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal title={isEditMode ? 'Edit Analysis' : 'Log New Analysis'} onClose={onClose} size="4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <label className="block text-sm font-medium text-future-gray mb-2">Analysis Screenshots</label>
          <div className="space-y-2">
            {screenshotUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {screenshotUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-24 object-cover rounded-md border border-future-panel" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 bg-risk-high/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onPaste={handlePaste}
              className="w-full h-24 bg-future-dark border-2 border-dashed border-photonic-blue/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-photonic-blue transition-colors"
            >
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <div className="text-center text-future-gray">
                <UploadIcon className="w-6 h-6 mx-auto" />
                <p className="mt-1 text-xs">Click to browse, or paste image</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AuthInput label="Symbol" id="symbol" name="symbol" value={formState.symbol} onChange={handleInputChange} required placeholder="e.g., EURUSD" />
            <SelectInput label="Category" id="category" name="category" value={formState.category} onChange={handleInputChange} options={Object.values(IncomeCategory).map(v => ({ value: v, label: v.replace('_', ' ') }))} />
            <SelectInput label="Asset Class" id="assetClass" name="assetClass" value={formState.assetClass} onChange={handleInputChange} options={Object.values(AssetClass).map(v => ({ value: v, label: v }))} />
            <SelectInput label="Market Venue" id="marketVenue" name="marketVenue" value={formState.marketVenue} onChange={handleInputChange} options={Object.values(MarketVenue).map(v => ({ value: v, label: v }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuthInput label="Higher Timeframe (HTF)" id="htf" name="htf" value={formState.htf} onChange={handleInputChange} placeholder="e.g., Daily, 4H" />
            <AuthInput label="Lower Timeframes (LTF)" id="ltf" name="ltf" value={formState.ltf} onChange={handleInputChange} placeholder="e.g., 15m, 5m, 1m" />
        </div>
        <SelectInput label="Directional Bias" id="directionalBias" name="directionalBias" value={formState.directionalBias} onChange={handleInputChange} options={[{ value: 'Buy', label: 'Long / Bullish' }, { value: 'Sell', label: 'Short / Bearish' }]}/>
        <Textarea label="Structure Notes (Markdown supported)" id="structureNotes" name="structureNotes" value={formState.structureNotes} onChange={handleInputChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput label="Review Cycle" id="reviewCycle" name="reviewCycle" value={formState.reviewCycle} onChange={handleInputChange} options={Object.values(ReviewCycle).map(v => ({ value: v, label: v }))} />
            <AuthInput label="Next Review Date" id="nextReviewAt" name="nextReviewAt" type="date" value={formState.nextReviewAt} onChange={handleInputChange} required />
        </div>

        <div className="mt-6 pt-6 border-t border-photonic-blue/10">
          {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Spinner /> : (isEditMode ? 'Save Changes' : 'Log Analysis')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAnalysisModal;