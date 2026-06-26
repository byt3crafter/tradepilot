import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
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

const inputClass = "w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-md px-3 py-2 text-jtp-text text-jtp-md placeholder-jtp-textDisabled focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors font-sans";

const AdminPricingPlans: React.FC = () => {
    const { accessToken } = useAuth();
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<PricingPlan>>({});

    const fetchPlans = async () => {
        if (!accessToken) return;
        try {
            setIsLoading(true);
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
            const promise = api.updatePricingPlan(id, {
                amount: Number(editForm.amount),
                paddlePriceId: editForm.paddlePriceId
            }, accessToken);

            await toast.promise(promise, {
                loading: 'Updating plan...',
                success: 'Plan updated successfully',
                error: 'Failed to update plan'
            });

            setEditingId(null);
            fetchPlans();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="text-jtp-textMuted text-jtp-sm">Loading pricing plans…</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-jtp-xl font-semibold text-jtp-text tracking-tight">Pricing Plans</h2>
                <Button variant="secondary" onClick={fetchPlans} className="text-jtp-sm h-8 px-3">
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-jtp-lg font-semibold text-jtp-text">{plan.name}</h3>
                                <p className="text-jtp-xs text-jtp-textDim uppercase tracking-wider mt-0.5">{plan.interval}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-jtp-xs text-jtp-xs font-mono font-semibold border ${
                                plan.isActive
                                    ? 'bg-jtp-profit/10 text-jtp-profit border-jtp-profit/25'
                                    : 'bg-jtp-loss/10 text-jtp-loss border-jtp-loss/25'
                            }`}>
                                {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        </div>

                        {editingId === plan.id ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-jtp-xs text-jtp-textDim uppercase tracking-wider mb-1.5">
                                        Paddle Price ID
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.paddlePriceId || ''}
                                        onChange={(e) => setEditForm({ ...editForm, paddlePriceId: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-jtp-xs text-jtp-textDim uppercase tracking-wider mb-1.5">
                                        Amount ({plan.currency})
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.amount || 0}
                                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button onClick={() => handleSave(plan.id)} className="text-jtp-sm h-8 px-3">
                                        Save Changes
                                    </Button>
                                    <Button variant="secondary" onClick={handleCancel} className="text-jtp-sm h-8 px-3">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center border-b border-jtp-borderSubtle pb-2.5">
                                    <span className="text-jtp-sm text-jtp-textDim">Price ID</span>
                                    <span className="font-mono text-jtp-xs text-jtp-textMuted">{plan.paddlePriceId}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-jtp-borderSubtle pb-2.5">
                                    <span className="text-jtp-sm text-jtp-textDim">Amount</span>
                                    <span className="font-mono font-semibold text-jtp-text">
                                        {plan.currency} {plan.amount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="pt-1">
                                    <Button variant="secondary" className="w-full text-jtp-sm h-8" onClick={() => handleEdit(plan)}>
                                        Edit Plan
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminPricingPlans;
