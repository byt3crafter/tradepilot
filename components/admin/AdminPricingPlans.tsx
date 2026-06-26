/**
 * AdminPricingPlans — Operator Console pricing plan editor.
 *
 * Grid of Panel cards, one per plan. Edit mode replaces the read view
 * with Field/Input controls. Status rendered as Badge.
 */
import React, { useState, useEffect } from 'react';
import {
  Panel,
  Badge,
  Button,
  Field,
  Input,
  Skeleton,
  EmptyState,
} from '../ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

interface PricingPlan {
  id: string;
  paddlePriceId: string;
  name: string;
  interval: string;
  amount: number;
  currency: string;
  isActive: boolean;
}

const AdminPricingPlans: React.FC = () => {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PricingPlan>>({});

  const fetchPlans = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await api.getPricingPlans(accessToken);
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch pricing plans', err);
      toast.error('Failed to load pricing plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [accessToken]);

  const handleEdit = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setEditForm(plan);
  };

  const handleSave = async (id: string) => {
    if (!accessToken) return;
    try {
      const promise = api.updatePricingPlan(
        id,
        { amount: Number(editForm.amount), paddlePriceId: editForm.paddlePriceId },
        accessToken,
      );
      await toast.promise(promise, {
        loading: 'Updating plan…',
        success: 'Plan updated',
        error: 'Failed to update plan',
      });
      setEditingId(null);
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton variant="panel" className="h-52" />
          <Skeleton variant="panel" className="h-52" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        label={`PRICING PLANS${plans.length ? ` (${plans.length})` : ''}`}
        actions={
          <Button
            variant="secondary"
            onClick={fetchPlans}
            className="h-7 px-3 text-jtp-xs"
          >
            Refresh
          </Button>
        }
      >
        {plans.length === 0 ? (
          <EmptyState
            title="No pricing plans"
            description="Pricing plans are managed through Paddle."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-jtp-raised border border-jtp-border rounded-jtp-panel overflow-hidden"
              >
                {/* Plan header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-jtp-border">
                  <div>
                    <p className="text-jtp-lg font-semibold text-jtp-text">{plan.name}</p>
                    <p className="font-mono text-jtp-xs text-jtp-textDim uppercase tracking-wider mt-0.5">
                      {plan.interval}
                    </p>
                  </div>
                  <Badge variant={plan.isActive ? 'profit' : 'neutral'} size="xs">
                    {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>

                {/* Plan body */}
                <div className="px-4 py-4">
                  {editingId === plan.id ? (
                    /* ── Edit mode ─────────────────────────────────────── */
                    <div className="space-y-3">
                      <Field label="PADDLE PRICE ID" htmlFor={`price-id-${plan.id}`}>
                        <Input
                          id={`price-id-${plan.id}`}
                          type="text"
                          value={editForm.paddlePriceId || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, paddlePriceId: e.target.value })
                          }
                          className="font-mono"
                          containerClassName="mb-0"
                        />
                      </Field>

                      <Field
                        label={`AMOUNT (${plan.currency})`}
                        htmlFor={`amount-${plan.id}`}
                      >
                        <Input
                          id={`amount-${plan.id}`}
                          type="number"
                          step="0.01"
                          value={editForm.amount ?? 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              amount: parseFloat(e.target.value),
                            })
                          }
                          className="font-mono"
                          containerClassName="mb-0"
                        />
                      </Field>

                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => handleSave(plan.id)}
                          className="flex-1 text-jtp-sm h-8"
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={handleCancel}
                          className="text-jtp-sm h-8 px-4"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Read mode ─────────────────────────────────────── */
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center border-b border-jtp-borderSubtle pb-2.5">
                        <span className="text-jtp-md text-jtp-textMuted">Paddle Price ID</span>
                        <span className="font-mono text-jtp-xs text-jtp-textMuted truncate max-w-[160px]">
                          {plan.paddlePriceId}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-jtp-borderSubtle pb-2.5">
                        <span className="text-jtp-md text-jtp-textMuted">Amount</span>
                        <span className="font-mono font-bold text-jtp-text text-jtp-lg tabular-nums">
                          {plan.currency} {plan.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="pt-1">
                        <Button
                          variant="secondary"
                          className="w-full text-jtp-sm h-8"
                          onClick={() => handleEdit(plan)}
                        >
                          Edit Plan
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default AdminPricingPlans;
