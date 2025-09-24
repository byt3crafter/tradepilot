import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import SelectInput from '../ui/SelectInput';
import { usePlaybook } from '../../context/PlaybookContext';
import { Trade } from '../../types';
import { useTrade } from '../../context/TradeContext';
import { useAccount } from '../../context/AccountContext';
import { useAssets } from '../../context/AssetContext';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TradeFormProps {
  tradeToEdit?: Trade | null;
  isPending: boolean;
  onSuccess: () => void;
}

// State for user-editable fields
interface FormInputState {
  asset: string;
  direction: 'Buy' | 'Sell';
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  playbookId: string;
  riskPercentage: string;
  lotSize: string;
}

// State for values returned from the API
interface CalculatedState {
    lotSize?: number;
    riskPercentage?: number;
    monetaryRisk?: number;
}

type CalculationMode = 'riskPercent' | 'lotSize';

// Custom debounce hook
const useDebounce = (value: any, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(value), delay]); // Deep comparison for object
    return debouncedValue;
};


const AddTradeForm: React.FC<TradeFormProps> = ({ tradeToEdit, isPending, onSuccess }) => {
  const { playbooks } = usePlaybook();
  const { createTrade, updateTrade } = useTrade();
  const { activeAccount } = useAccount();
  const { findSpec, specs } = useAssets();
  const { accessToken } = useAuth();
  
  const isEditMode = !!tradeToEdit;

  const [formState, setFormState] = useState<FormInputState>({
    asset: '',
    direction: 'Buy',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    lotSize: '',
    riskPercentage: '1',
    playbookId: '',
  });

  const [calculationMode, setCalculationMode] = useState<CalculationMode>('riskPercent');
  const [calculatedValues, setCalculatedValues] = useState<CalculatedState>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form on initial load or when editing
  useEffect(() => {
    if (isEditMode && tradeToEdit) {
      setFormState({
        asset: tradeToEdit.asset || '',
        direction: tradeToEdit.direction || 'Buy',
        entryPrice: tradeToEdit.entryPrice?.toString() ?? '',
        stopLoss: tradeToEdit.stopLoss?.toString() ?? '',
        takeProfit: tradeToEdit.takeProfit?.toString() ?? '',
        lotSize: tradeToEdit.lotSize?.toString() ?? '',
        riskPercentage: tradeToEdit.riskPercentage?.toString() ?? '1',
        playbookId: tradeToEdit.playbookId || '',
      });
      // In edit mode, if lot size exists, default to that calculation mode
      if (tradeToEdit.lotSize) {
          setCalculationMode('lotSize');
      }
    } else {
        setFormState(prev => ({ 
            ...prev, 
            playbookId: playbooks[0]?.id || '' 
        }));
    }
  }, [tradeToEdit, isEditMode, playbooks]);
  
  // Define the inputs that should trigger a debounced calculation
  const calculationDependencies = useMemo(() => ({
    asset: formState.asset,
    entryPrice: formState.entryPrice,
    stopLoss: formState.stopLoss,
    riskPercentage: formState.riskPercentage,
    lotSize: formState.lotSize,
    calculationMode,
  }), [formState.asset, formState.entryPrice, formState.stopLoss, formState.riskPercentage, formState.lotSize, calculationMode]);
  
  const debouncedCalcInputs = useDebounce(calculationDependencies, 500);

  const calculateValues = useCallback(async () => {
    const { asset, entryPrice, stopLoss, riskPercentage, lotSize, calculationMode: mode } = debouncedCalcInputs;

    const isValidForCalc = asset && entryPrice && stopLoss && activeAccount && accessToken && findSpec(asset);
    if (!isValidForCalc) {
        setCalculatedValues({});
        return;
    }
    
    const entryPriceNum = Number(entryPrice);
    const stopLossNum = Number(stopLoss);
    if (isNaN(entryPriceNum) || isNaN(stopLossNum) || entryPriceNum === stopLossNum) {
        setCalculatedValues({});
        return;
    }

    setIsCalculating(true);
    setError('');
    
    try {
      if (mode === 'lotSize' && Number(lotSize) > 0) {
          const data = { asset, lotSize: Number(lotSize), entryPrice: entryPriceNum, stopLoss: stopLossNum, accountBalance: activeAccount.currentBalance };
          const result = await api.calculateRisk(data, accessToken);
          setCalculatedValues({ ...result, lotSize: Number(lotSize) });
      } else if (mode === 'riskPercent' && Number(riskPercentage) > 0) {
          const data = { asset, riskPercentage: Number(riskPercentage), entryPrice: entryPriceNum, stopLoss: stopLossNum, accountBalance: activeAccount.currentBalance };
          const result = await api.calculatePositionSize(data, accessToken);
          const monetaryRisk = activeAccount.currentBalance * (Number(riskPercentage) / 100);
          setCalculatedValues({ ...result, monetaryRisk, riskPercentage: Number(riskPercentage) });
      } else {
        setCalculatedValues({});
      }
    } catch (e: any) {
        console.error("Calculation failed:", e);
        setError(e.message || "Calculation failed.");
        setCalculatedValues({});
    } finally {
        setIsCalculating(false);
    }
  }, [debouncedCalcInputs, activeAccount, accessToken, findSpec]);

  useEffect(() => {
    calculateValues();
  }, [calculateValues]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleModeChange = (mode: CalculationMode) => {
    setCalculationMode(mode);
    setCalculatedValues({}); // Clear calculations on mode switch
  };

  const canSubmit = useMemo(() => {
    return formState.playbookId && formState.asset && calculatedValues.lotSize && calculatedValues.lotSize > 0;
  }, [formState.playbookId, formState.asset, calculatedValues.lotSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please fill all required fields and ensure calculation is complete.");
      return;
    };
    
    setIsLoading(true);
    setError('');

    const payload: Partial<Trade> = {
      asset: formState.asset,
      direction: formState.direction,
      entryPrice: Number(formState.entryPrice),
      riskPercentage: Number(calculatedValues.riskPercentage),
      lotSize: Number(calculatedValues.lotSize),
      playbookId: formState.playbookId,
      isPendingOrder: isPending,
      entryDate: new Date().toISOString(), // Correctly set on backend for pending orders anyway
      stopLoss: formState.stopLoss ? Number(formState.stopLoss) : null,
      takeProfit: formState.takeProfit ? Number(formState.takeProfit) : null,
    };

    try {
      if (isEditMode && tradeToEdit) {
        await updateTrade(tradeToEdit.id, payload);
      } else {
        await createTrade(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Display values for the inputs
  const riskPercentValue = calculationMode === 'lotSize' ? (calculatedValues.riskPercentage?.toFixed(3) ?? '') : formState.riskPercentage;
  const lotSizeValue = calculationMode === 'riskPercent' ? (calculatedValues.lotSize?.toFixed(5) ?? '') : formState.lotSize;


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Asset"
          id="asset" name="asset" type="text" placeholder="e.g., EURUSD"
          value={formState.asset} onChange={handleInputChange} required list="asset-list"
        />
        <datalist id="asset-list">
            {specs.map((spec) => <option key={spec.symbol} value={spec.symbol} />)}
        </datalist>

        <SelectInput
          label="Direction"
          id="direction" name="direction"
          value={formState.direction} onChange={handleInputChange}
          options={[{ value: 'Buy', label: 'Buy (Long)' }, { value: 'Sell', label: 'Sell (Short)' }]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Entry Price"
          id="entryPrice" name="entryPrice" type="number" step="any"
          value={formState.entryPrice} onChange={handleInputChange} required
        />
        <AuthInput
            label="Stop Loss"
            id="stopLoss" name="stopLoss" type="number" step="any"
            value={formState.stopLoss} onChange={handleInputChange} required
        />
      </div>

      <div className="p-3 bg-future-dark/50 rounded-lg border border-photonic-blue/10">
          <div className="flex items-center gap-4 mb-3">
              <span className="text-sm text-future-light">Calculate by:</span>
               <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="calcMode" value="riskPercent" checked={calculationMode === 'riskPercent'} onChange={() => handleModeChange('riskPercent')} className="accent-photonic-blue" /> Risk %
                  </label>
                   <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="calcMode" value="lotSize" checked={calculationMode === 'lotSize'} onChange={() => handleModeChange('lotSize')} className="accent-photonic-blue" /> Lot Size
                  </label>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <AuthInput
                label="Risk (%)" id="riskPercentage" name="riskPercentage"
                type="number" step="0.01" value={riskPercentValue}
                onChange={handleInputChange} disabled={calculationMode === 'lotSize'}
              />
              <AuthInput
                label="Lot Size" id="lotSize" name="lotSize"
                type="number" step="any" value={lotSizeValue}
                onChange={handleInputChange} disabled={calculationMode === 'riskPercent'}
              />
          </div>
          <div className="h-5 mt-1 text-xs">
            {isCalculating && <div className="text-future-gray flex items-center gap-2"><Spinner/> Calculating...</div>}
            {!isCalculating && calculatedValues.monetaryRisk !== undefined && (
                <div className="text-future-light">
                    Monetary Risk: <span className="font-semibold text-momentum-green">${calculatedValues.monetaryRisk.toFixed(2)}</span>
                </div>
            )}
          </div>
      </div>

       <AuthInput
            label="Take Profit (Optional)"
            id="takeProfit" name="takeProfit" type="number" step="any"
            value={formState.takeProfit} onChange={handleInputChange}
        />

        <SelectInput
          label="Playbook"
          id="playbookId" name="playbookId"
          value={formState.playbookId} onChange={handleInputChange}
          disabled={playbooks.length === 0}
          options={playbooks.length > 0
            ? playbooks.map(s => ({ value: s.id, label: s.name }))
            : [{ value: '', label: 'Create a playbook first' }]
          }
        />

      <div className="mt-6 pt-6 border-t border-photonic-blue/10">
        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
        
        <Button type="submit" disabled={isLoading || isCalculating || !canSubmit} className="w-full">
          {isLoading ? <Spinner /> : (isEditMode ? 'Save Changes' : 'Log Trade')}
        </Button>
      </div>
    </form>
  );
};

export default AddTradeForm;
