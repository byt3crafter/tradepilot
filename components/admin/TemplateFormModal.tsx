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
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-secondary mb-2">Template Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., FTMO $100k Challenge"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-secondary mb-2">Firm Name</label>
          <input
            type="text"
            name="firmName"
            value={formData.firmName}
            onChange={handleChange}
            placeholder="e.g., FTMO"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-secondary mb-2">Account Size ($)</label>
          <input
            type="number"
            name="accountSize"
            value={formData.accountSize}
            onChange={handleChange}
            step="1000"
            min="0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-secondary mb-2">Profit Target ($)</label>
          <input
            type="number"
            name="profitTarget"
            value={formData.profitTarget}
            onChange={handleChange}
            step="100"
            min="0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-secondary mb-2">Daily Drawdown ($)</label>
          <input
            type="number"
            name="dailyDrawdown"
            value={formData.dailyDrawdown}
            onChange={handleChange}
            step="100"
            min="0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-secondary mb-2">Max Drawdown ($)</label>
          <input
            type="number"
            name="maxDrawdown"
            value={formData.maxDrawdown}
            onChange={handleChange}
            step="100"
            min="0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-secondary mb-2">Drawdown Type</label>
          <select
            name="drawdownType"
            value={formData.drawdownType}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          >
            <option value="TRAILING">Trailing</option>
            <option value="STATIC">Static</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-secondary mb-2">Min Trading Days</label>
          <input
            type="number"
            name="minTradingDays"
            value={formData.minTradingDays}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            required
          />
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 bg-white/5 border border-white/10 rounded"
          />
          <label className="text-sm text-white">Active Template</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-auto"
        >
          {isSubmitting ? <Spinner /> : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};

export default TemplateFormModal;
