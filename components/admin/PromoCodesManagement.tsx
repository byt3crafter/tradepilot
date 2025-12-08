import React, { useState, useEffect } from 'react';
import Card from '../Card';
import Button from '../ui/Button';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../Spinner';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface PromoCode {
    id: string;
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    maxUses?: number;
    usedCount: number;
    expiresAt?: string;
    isActive: boolean;
}

const PromoCodesManagement: React.FC = () => {
    const { accessToken } = useAuth();
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newCode, setNewCode] = useState({
        code: '',
        type: 'PERCENTAGE',
        value: 0,
        maxUses: '',
        expiresAt: '',
    });

    const fetchCodes = async () => {
        if (!accessToken) return;
        try {
            const data = await api.getPromoCodes(accessToken);
            setCodes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCodes();
    }, [accessToken]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        try {
            await api.createPromoCode({
                ...newCode,
                value: Number(newCode.value),
                maxUses: newCode.maxUses ? Number(newCode.maxUses) : undefined,
                expiresAt: newCode.expiresAt ? new Date(newCode.expiresAt) : undefined,
            }, accessToken);
            setIsCreating(false);
            setNewCode({ code: '', type: 'PERCENTAGE', value: 0, maxUses: '', expiresAt: '' });
            fetchCodes();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!accessToken || !window.confirm('Are you sure?')) return;
        try {
            await api.deletePromoCode(id, accessToken);
            fetchCodes();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-orbitron text-white">Promo Codes</h1>
                <Button onClick={() => setIsCreating(true)}><PlusIcon className="w-4 h-4 mr-2" /> Create Code</Button>
            </div>

            {isCreating && (
                <Card>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-future-gray mb-1">Code</label>
                                <input
                                    required
                                    value={newCode.code}
                                    onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                                    placeholder="SUMMER2025"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-future-gray mb-1">Type</label>
                                <select
                                    value={newCode.type}
                                    onChange={e => setNewCode({ ...newCode, type: e.target.value as any })}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                                >
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-future-gray mb-1">Value</label>
                                <input
                                    type="number"
                                    required
                                    value={newCode.value}
                                    onChange={e => setNewCode({ ...newCode, value: Number(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-future-gray mb-1">Max Uses (Optional)</label>
                                <input
                                    type="number"
                                    value={newCode.maxUses}
                                    onChange={e => setNewCode({ ...newCode, maxUses: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-future-gray mb-1">Expires At (Optional)</label>
                                <input
                                    type="date"
                                    value={newCode.expiresAt}
                                    onChange={e => setNewCode({ ...newCode, expiresAt: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button type="submit">Create</Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-future-gray uppercase bg-white/5">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Code</th>
                                <th className="px-4 py-3">Discount</th>
                                <th className="px-4 py-3">Usage</th>
                                <th className="px-4 py-3">Expires</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map(code => (
                                <tr key={code.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                    <td className="px-4 py-3 font-mono font-bold text-momentum-green">{code.code}</td>
                                    <td className="px-4 py-3">
                                        {code.type === 'PERCENTAGE' ? `${code.value}%` : `$${code.value}`}
                                    </td>
                                    <td className="px-4 py-3">
                                        {code.usedCount} {code.maxUses ? `/ ${code.maxUses}` : ''}
                                    </td>
                                    <td className="px-4 py-3 text-future-gray">
                                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(code.id)} className="text-risk-high hover:text-white">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {codes.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-future-gray">No promo codes found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default PromoCodesManagement;
