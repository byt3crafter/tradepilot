
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import ImageUploader from './ImageUploader';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';
import { useAssets } from '../../context/AssetContext';
import api from '../../services/api';
import { AnalyzeChartResult } from '../../types';

interface AutofillModalProps {
  onClose: () => void;
  onApply: (data: AnalyzeChartResult) => void;
}

const ReviewItem: React.FC<{ label: string; value: string | number | null | undefined }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-future-gray">{label}:</span>
    <span className="font-semibold font-tech-mono text-future-light">{value ?? 'N/A'}</span>
  </div>
);

const AutofillModal: React.FC<AutofillModalProps> = ({ onClose, onApply }) => {
  const { accessToken } = useAuth();
  const { specs } = useAssets();
  
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState<AnalyzeChartResult | null>(null);

  const handleImageUpload = async (base64: string | null) => {
    setImage(base64);
    if (base64 && accessToken) {
      setIsLoading(true);
      setError('');
      setExtractedData(null);
      try {
        const availableAssets = specs.map(s => s.symbol);
        const result = await api.analyzeChart(base64, availableAssets, accessToken);
        setExtractedData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to analyze the image.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApply(extractedData);
    }
  };
  
  const handleReset = () => {
    setImage(null);
    setExtractedData(null);
    setError('');
  };

  return (
    <Modal title="Autofill with AI" onClose={onClose} size="lg">
      <div className="space-y-4">
        {!extractedData ? (
          <>
            <p className="text-sm text-center text-future-gray">
              Upload a screenshot of your trade details (e.g., from a confirmation, platform, or position tool). The AI will attempt to extract the info.
            </p>
            <ImageUploader 
              label=""
              onImageUpload={handleImageUpload}
              currentImage={image}
            />
            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-future-gray">
                <Spinner />
                <span>Analyzing image...</span>
              </div>
            )}
          </>
        ) : (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-semibold text-center text-photonic-blue mb-3">Extracted Data</h3>
            <p className="text-sm text-center text-future-gray mb-4">Review the data below. If it's correct, click "Apply" to fill the form.</p>
            <div className="p-4 bg-future-dark/50 rounded-lg space-y-2 border border-photonic-blue/20">
              <ReviewItem label="Asset" value={extractedData.asset} />
              <ReviewItem label="Direction" value={extractedData.direction} />
              {extractedData.entryDate && <ReviewItem label="Entry Date" value={new Date(extractedData.entryDate).toLocaleString()} />}
              {extractedData.entryPrice && <ReviewItem label="Entry Price" value={extractedData.entryPrice} />}
              {extractedData.exitDate && <ReviewItem label="Exit Date" value={new Date(extractedData.exitDate).toLocaleString()} />}
              {extractedData.exitPrice && <ReviewItem label="Exit Price" value={extractedData.exitPrice} />}
              {extractedData.profitLoss && <ReviewItem label="Net P/L" value={`$${extractedData.profitLoss.toFixed(2)}`} />}
              <ReviewItem label="Lot Size" value={extractedData.lotSize} />
              <ReviewItem label="Stop Loss" value={extractedData.stopLoss} />
              <ReviewItem label="Take Profit" value={extractedData.takeProfit} />
              <ReviewItem label="Commission" value={extractedData.commission} />
              <ReviewItem label="Swap" value={extractedData.swap} />
            </div>
          </div>
        )}

        {error && <p className="text-risk-high text-sm text-center my-2">{error}</p>}
        
        <div className="mt-6 pt-6 border-t border-photonic-blue/10 flex justify-end gap-3">
          <Button 
            type="button" 
            onClick={handleReset} 
            variant="secondary"
            className="w-auto"
            disabled={isLoading}
          >
            {extractedData ? 'Clear & Restart' : 'Clear'}
          </Button>
          <Button 
            type="button" 
            onClick={handleApply} 
            className="w-auto" 
            disabled={!extractedData || isLoading}
          >
            Apply to Form
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AutofillModal;
