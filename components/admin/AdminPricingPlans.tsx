import React, { useState, useEffect } from 'react';
import Card from '../Card';
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

    if (isLoading) return <div className="text-center p-8 text-future-gray">Loading pricing plans...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-orbitron text-white">Pricing Plans</h2>
                <Button variant="outline" onClick={fetchPlans} size="sm">Refresh</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="border-white/10 relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                <p className="text-sm text-future-gray uppercase tracking-wider">{plan.interval}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-mono ${plan.isActive ? 'bg-momentum-green/20 text-momentum-green' : 'bg-red-500/20 text-red-400'}`}>
                                {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                        </div>

                        {editingId === plan.id ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-future-gray mb-1">Paddle Price ID</label>
                                    <input
                                        type="text"
                                        value={editForm.paddlePriceId || ''}
                                        onChange={(e) => setEditForm({ ...editForm, paddlePriceId: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-momentum-green focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-future-gray mb-1">Amount ({plan.currency})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.amount || 0}
                                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-momentum-green focus:outline-none"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button size="sm" onClick={() => handleSave(plan.id)}>Save Changes</Button>
                                    <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-future-gray text-sm">Price ID</span>
                                    <span className="text-white font-mono text-xs">{plan.paddlePriceId}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-future-gray text-sm">Amount</span>
                                    <span className="text-white font-bold">{plan.currency} {plan.amount.toFixed(2)}</span>
                                </div>

                                <div className="pt-2">
                                    <Button variant="secondary" className="w-full" onClick={() => handleEdit(plan)}>Edit Plan</Button>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default AdminPricingPlans;
