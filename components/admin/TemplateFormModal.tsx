/**
 * TemplateFormModal — Create / edit a Prop Firm Template.
 *
 * Uses Field + Input + SelectInput + Checkbox from the kit for consistent
 * form styling. No raw <label>/<input> pairs.
 */
import React, { useState, useEffect } from 'react';
import { PropFirmTemplate, CreatePropFirmTemplateDto } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Field, Input, SelectInput, Checkbox, Button } from '../ui';

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

  const setField = (key: keyof CreatePropFirmTemplateDto, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

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
      {/* Error banner */}
      {error && (
        <div className="bg-jtp-loss/10 border border-jtp-loss/20 rounded-jtp-md px-4 py-3 text-jtp-loss text-jtp-md">
          {error}
        </div>
      )}

      {/* Template name + firm name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="TEMPLATE NAME" htmlFor="tmpl-name" required>
            <Input
              id="tmpl-name"
              type="text"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g., FTMO $100k Challenge"
              required
              containerClassName="mb-0"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="FIRM NAME" htmlFor="tmpl-firm" required>
            <Input
              id="tmpl-firm"
              type="text"
              value={formData.firmName}
              onChange={(e) => setField('firmName', e.target.value)}
              placeholder="e.g., FTMO"
              required
              containerClassName="mb-0"
            />
          </Field>
        </div>

        {/* Numeric fields */}
        <Field label="ACCOUNT SIZE ($)" htmlFor="tmpl-account" required>
          <Input
            id="tmpl-account"
            type="number"
            step="1000"
            min="0"
            value={formData.accountSize}
            onChange={(e) => setField('accountSize', parseFloat(e.target.value) || 0)}
            className="font-mono"
            required
            containerClassName="mb-0"
          />
        </Field>

        <Field label="PROFIT TARGET ($)" htmlFor="tmpl-target" required>
          <Input
            id="tmpl-target"
            type="number"
            step="100"
            min="0"
            value={formData.profitTarget}
            onChange={(e) => setField('profitTarget', parseFloat(e.target.value) || 0)}
            className="font-mono"
            required
            containerClassName="mb-0"
          />
        </Field>

        <Field label="DAILY DRAWDOWN ($)" htmlFor="tmpl-daily" required>
          <Input
            id="tmpl-daily"
            type="number"
            step="100"
            min="0"
            value={formData.dailyDrawdown}
            onChange={(e) => setField('dailyDrawdown', parseFloat(e.target.value) || 0)}
            className="font-mono"
            required
            containerClassName="mb-0"
          />
        </Field>

        <Field label="MAX DRAWDOWN ($)" htmlFor="tmpl-max" required>
          <Input
            id="tmpl-max"
            type="number"
            step="100"
            min="0"
            value={formData.maxDrawdown}
            onChange={(e) => setField('maxDrawdown', parseFloat(e.target.value) || 0)}
            className="font-mono"
            required
            containerClassName="mb-0"
          />
        </Field>

        <SelectInput
          id="tmpl-ddtype"
          label="DRAWDOWN TYPE"
          value={formData.drawdownType}
          onChange={(e) => setField('drawdownType', e.target.value)}
          options={[
            { value: 'TRAILING', label: 'Trailing' },
            { value: 'STATIC', label: 'Static' },
          ]}
          containerClassName="mb-0"
        />

        <Field label="MIN TRADING DAYS" htmlFor="tmpl-mindays" required>
          <Input
            id="tmpl-mindays"
            type="number"
            min="1"
            value={formData.minTradingDays}
            onChange={(e) => setField('minTradingDays', parseInt(e.target.value, 10) || 1)}
            className="font-mono"
            required
            containerClassName="mb-0"
          />
        </Field>
      </div>

      {/* Active toggle */}
      <div className="pt-1">
        <Checkbox
          id="tmpl-active"
          label="Active Template (visible to users)"
          checked={formData.isActive}
          onChange={(e) => setField('isActive', e.target.checked)}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-jtp-border">
        <Button type="submit" isLoading={isSubmitting} className="text-jtp-sm h-9 px-5">
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};

export default TemplateFormModal;
