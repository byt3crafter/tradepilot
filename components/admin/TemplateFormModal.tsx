import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { PropFirmTemplate, CreatePropFirmTemplateDto } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../Spinner';

interface TemplateFormModalProps {
  template?: PropFirmTemplate | null;
  onSuccess: () => void;
}

const inputClass = "w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-md px-3 py-2 text-jtp-text text-jtp-md placeholder-jtp-textDisabled focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors font-sans";
const selectClass = `${inputClass} [&>option]:bg-jtp-panel [&>option]:text-jtp-text`;
const labelClass = "block text-jtp-xs text-jtp-textDim uppercase tracking-wider mb-1.5";

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({ template, onSuccess }) => {
  const { accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreatePropFirmTemplateDto>({
    name: '',
    firmName: '',
    accountSize: 100000,
    profitTarget: 10000,
    dailyDrawdown: 5000,
    maxDrawdown: 10000,
    drawdownType: 'TRAILING',
    minTradingDays: 10,
    isActive: true,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        firmName: template.firmName,
        accountSize: template.accountSize,
        profitTarget: template.profitTarget,
        dailyDrawdown: template.dailyDrawdown,
        maxDrawdown: template.maxDrawdown,
        drawdownType: template.drawdownType,
        minTradingDays: template.minTradingDays,
        isActive: template.isActive,
      });
    }
  }, [template]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (template) {
        await api.updatePropFirmTemplate(accessToken, template.id, formData);
      } else {
        await api.createPropFirmTemplate(accessToken, formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-jtp-loss/10 border border-jtp-loss/20 rounded-jtp-md p-3 text-jtp-loss text-jtp-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Template Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., FTMO $100k Challenge"
            className={inputClass}
            required
          />
        </div>

        <div className="col-span-2">
          <label className={labelClass}>Firm Name</label>
          <input
            type="text"
            name="firmName"
            value={formData.firmName}
            onChange={handleChange}
            placeholder="e.g., FTMO"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Account Size ($)</label>
          <input
            type="number"
            name="accountSize"
            value={formData.accountSize}
            onChange={handleChange}
            step="1000"
            min="0"
            className={`${inputClass} font-mono`}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Profit Target ($)</label>
          <input
            type="number"
            name="profitTarget"
            value={formData.profitTarget}
            onChange={handleChange}
            step="100"
            min="0"
            className={`${inputClass} font-mono`}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Daily Drawdown ($)</label>
          <input
            type="number"
            name="dailyDrawdown"
            value={formData.dailyDrawdown}
            onChange={handleChange}
            step="100"
            min="0"
            className={`${inputClass} font-mono`}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Max Drawdown ($)</label>
          <input
            type="number"
            name="maxDrawdown"
            value={formData.maxDrawdown}
            onChange={handleChange}
            step="100"
            min="0"
            className={`${inputClass} font-mono`}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Drawdown Type</label>
          <select
            name="drawdownType"
            value={formData.drawdownType}
            onChange={handleChange}
            className={selectClass}
            required
          >
            <option value="TRAILING">Trailing</option>
            <option value="STATIC">Static</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Min Trading Days</label>
          <input
            type="number"
            name="minTradingDays"
            value={formData.minTradingDays}
            onChange={handleChange}
            min="1"
            className={`${inputClass} font-mono`}
            required
          />
        </div>

        <div className="col-span-2 flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 rounded-jtp-xs border-2 border-jtp-borderStrong bg-jtp-control checked:bg-jtp-blue checked:border-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-jtp-panel focus:ring-jtp-blue accent-jtp-blue"
          />
          <label htmlFor="isActive" className="text-jtp-md text-jtp-text cursor-pointer">
            Active Template
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-jtp-border">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-auto text-jtp-sm h-8 px-4"
        >
          {isSubmitting ? <Spinner /> : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};

export default TemplateFormModal;
