import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../Spinner';
import { UsersIcon } from '../icons/UsersIcon';
import GenerateInviteModal from './GenerateInviteModal';
import Button from '../ui/Button';

interface ReferralStats {
    totalReferrals: number;
    topReferrers: {
        id: string;
        fullName: string;
        email: string;
        referralCount: number;
    }[];
    recentReferrals: {
        id: string;
        fullName: string;
        email: string;
        createdAt: string;
        subscriptionStatus: string;
        hasRewardedReferrer: boolean;
        referrer: {
            id: string;
            fullName: string;
        };
    }[];
}

interface InviteCode {
    id: string;
    code: string;
    type: 'TRIAL' | 'LIFETIME';
    duration?: number;
    isUsed: boolean;
    createdAt: string;
    usedByUser?: {
        id: string;
        fullName: string;
        email: string;
    };
}

const subStatusClass = (status: string) => {
    if (status === 'ACTIVE') return 'bg-jtp-profit/10 text-jtp-profit border-jtp-profit/25';
    if (status === 'TRIALING') return 'bg-jtp-blue/10 text-jtp-blue border-jtp-blue/25';
    return 'bg-jtp-loss/10 text-jtp-loss border-jtp-loss/25';
};

const ReferralDashboard: React.FC = () => {
    const { accessToken } = useAuth();
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [invites, setInvites] = useState<InviteCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const fetchData = async () => {
        if (!accessToken) return;
        try {
            const [statsData, invitesData] = await Promise.all([
                api.getReferralStats(accessToken),
                api.getInvites(accessToken)
            ]);
            setStats(statsData);
            setInvites(invitesData);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [accessToken]);

    if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
    if (error) return <div className="text-jtp-loss p-4 text-center text-jtp-sm">{error}</div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-jtp-xl font-semibold text-jtp-text tracking-tight">Referral Program</h1>
                <Button onClick={() => setIsInviteModalOpen(true)} className="text-jtp-sm h-8 px-3">
                    Generate Invite Link
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-jtp-md bg-jtp-profit/10 border border-jtp-profit/20 flex items-center justify-center flex-shrink-0">
                        <UsersIcon className="w-5 h-5 text-jtp-profit" />
                    </div>
                    <div>
                        <p className="text-jtp-xs text-jtp-textDim uppercase tracking-wider">Total Referrals</p>
                        <p className="font-mono text-jtp-3xl font-bold text-jtp-text tabular-nums mt-0.5">{stats.totalReferrals}</p>
                    </div>
                </div>
            </div>

            {/* Invite Codes Section */}
            <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
                <div className="px-5 py-4 border-b border-jtp-border">
                    <h3 className="text-jtp-lg font-semibold text-jtp-text">Active Invite Codes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-jtp-sm text-left">
                        <thead>
                            <tr className="bg-jtp-raised border-b border-jtp-border">
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Code</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Type</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Duration</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider text-right">Used By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map((invite) => (
                                <tr key={invite.id} className="border-b border-jtp-borderSubtle last:border-0 hover:bg-jtp-hover transition-colors">
                                    <td className="px-4 py-3 font-mono font-semibold text-jtp-profit">{invite.code}</td>
                                    <td className="px-4 py-3 text-jtp-textMuted">{invite.type}</td>
                                    <td className="px-4 py-3 font-mono text-jtp-textDim">
                                        {invite.duration ? `${invite.duration} days` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {invite.isUsed ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border bg-jtp-loss/10 text-jtp-loss border-jtp-loss/25">USED</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border bg-jtp-profit/10 text-jtp-profit border-jtp-profit/25">ACTIVE</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-jtp-textDim">
                                        {invite.usedByUser ? (
                                            <div>
                                                <div className="text-jtp-textMuted">{invite.usedByUser.fullName}</div>
                                                <div className="text-jtp-xs text-jtp-textDim">{invite.usedByUser.email}</div>
                                            </div>
                                        ) : '—'}
                                    </td>
                                </tr>
                            ))}
                            {invites.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-jtp-textDim">
                                        No invite codes generated yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Referrers */}
                <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
                    <div className="px-5 py-4 border-b border-jtp-border">
                        <h3 className="text-jtp-lg font-semibold text-jtp-text">Top Referrers</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-jtp-sm text-left">
                            <thead>
                                <tr className="bg-jtp-raised border-b border-jtp-border">
                                    <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">User</th>
                                    <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider text-right">Referrals</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topReferrers.map((referrer) => (
                                    <tr key={referrer.id} className="border-b border-jtp-borderSubtle last:border-0 hover:bg-jtp-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-jtp-text">{referrer.fullName}</div>
                                            <div className="text-jtp-xs text-jtp-textDim">{referrer.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-jtp-profit tabular-nums">
                                            {referrer.referralCount}
                                        </td>
                                    </tr>
                                ))}
                                {stats.topReferrers.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-10 text-center text-jtp-textDim">No referrers yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Referrals */}
                <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
                    <div className="px-5 py-4 border-b border-jtp-border">
                        <h3 className="text-jtp-lg font-semibold text-jtp-text">Recent Referrals</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-jtp-sm text-left">
                            <thead>
                                <tr className="bg-jtp-raised border-b border-jtp-border">
                                    <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Referred User</th>
                                    <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Referrer</th>
                                    <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2.5 text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider text-right">Reward</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentReferrals.map((referral) => (
                                    <tr key={referral.id} className="border-b border-jtp-borderSubtle last:border-0 hover:bg-jtp-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-jtp-text">{referral.fullName}</div>
                                            <div className="text-jtp-xs text-jtp-textDim">
                                                {new Date(referral.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-jtp-textMuted">
                                            {referral.referrer?.fullName || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border ${subStatusClass(referral.subscriptionStatus)}`}>
                                                {referral.subscriptionStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {referral.hasRewardedReferrer ? (
                                                <span className="text-jtp-profit text-jtp-xs font-semibold">PAID</span>
                                            ) : (
                                                <span className="text-jtp-textDim text-jtp-xs">PENDING</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {stats.recentReferrals.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center text-jtp-textDim">No referrals yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <GenerateInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </div>
    );
};

export default ReferralDashboard;
