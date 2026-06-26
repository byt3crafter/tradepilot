import React, { useState, useEffect } from 'react';
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

const inputClass = "w-full bg-jtp-control border border-jtp-borderStrong rounded-jtp-md px-3 py-2 text-jtp-text text-jtp-md placeholder-jtp-textDisabled focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors font-sans";
const selectClass = `${inputClass} [&>option]:bg-jtp-panel [&>option]:text-jtp-text`;
const labelClass = "block text-jtp-xs text-jtp-textDim uppercase tracking-wider mb-1.5";

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

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex justify-between items-center">
                <h1 className="text-jtp-xl font-semibold text-jtp-text tracking-tight">Promo Codes</h1>
                <Button onClick={() => setIsCreating(true)} className="text-jtp-sm h-8 px-3">
                    <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
                    Create Code
                </Button>
            </div>

            {isCreating && (
                <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-5">
                    <h3 className="text-jtp-md font-semibold text-jtp-text mb-4">New Promo Code</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Code</label>
                                <input
                                    required
                                    value={newCode.code}
                                    onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                    className={`${inputClass} font-mono uppercase`}
                                    placeholder="SUMMER2025"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Type</label>
                                <select
                                    value={newCode.type}
                                    onChange={e => setNewCode({ ...newCode, type: e.target.value as any })}
                                    className={selectClass}
                                >
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Value</label>
                                <input
                                    type="number"
                                    required
                                    value={newCode.value}
                                    onChange={e => setNewCode({ ...newCode, value: Number(e.target.value) })}
                                    className={`${inputClass} font-mono`}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Max Uses (optional)</label>
                                <input
                                    type="number"
                                    value={newCode.maxUses}
                                    onChange={e => setNewCode({ ...newCode, maxUses: e.target.value })}
                                    className={`${inputClass} font-mono`}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Expires At (optional)</label>
                                <input
                                    type="date"
                                    value={newCode.expiresAt}
                                    onChange={e => setNewCode({ ...newCode, expiresAt: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="secondary" onClick={() => setIsCreating(false)} className="text-jtp-sm h-8 px-3">
                                Cancel
                            </Button>
                            <Button type="submit" className="text-jtp-sm h-8 px-3">
                                Create
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-jtp-sm text-left">
                        <thead>
                            <tr className="bg-jtp-raised border-b border-jtp-border">
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Code</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Discount</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Usage</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Expires</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map(code => (
                                <tr key={code.id} className="border-b border-jtp-borderSubtle last:border-0 hover:bg-jtp-hover transition-colors">
                                    <td className="px-4 py-3 font-mono font-semibold text-jtp-profit">{code.code}</td>
                                    <td className="px-4 py-3 font-mono text-jtp-text tabular-nums">
                                        {code.type === 'PERCENTAGE' ? `${code.value}%` : `$${code.value}`}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-jtp-textMuted tabular-nums">
                                        {code.usedCount}{code.maxUses ? ` / ${code.maxUses}` : ''}
                                    </td>
                                    <td className="px-4 py-3 text-jtp-textDim">
                                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(code.id)}
                                            className="p-1.5 text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-loss/10 rounded-jtp-sm transition-colors"
                                            aria-label="Delete promo code"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {codes.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-jtp-textDim">
                                        No promo codes found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PromoCodesManagement;
