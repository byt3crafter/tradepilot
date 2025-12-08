import React, { useEffect, useState } from 'react';
import Card from '../Card';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../Spinner';
import { UsersIcon } from '../icons/UsersIcon';
import GenerateInviteModal from './GenerateInviteModal';

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
    if (error) return <div className="text-risk-high p-4 text-center">{error}</div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-orbitron text-white">Referral Program Dashboard</h1>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-photonic-blue text-black font-bold px-4 py-2 rounded hover:bg-photonic-blue/90"
                >
                    Generate Invite Link
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex items-center gap-4">
                    <div className="p-3 bg-momentum-green/10 rounded-lg text-momentum-green">
                        <UsersIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-future-gray uppercase tracking-wider font-bold">Total Referrals</p>
                        <p className="text-3xl font-bold text-white">{stats.totalReferrals}</p>
                    </div>
                </Card>
            </div>

            {/* Invite Codes Section */}
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Active Invite Codes</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-future-gray uppercase bg-white/5">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Code</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Duration</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Used By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map((invite) => (
                                <tr key={invite.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-mono text-momentum-green font-bold">
                                        {invite.code}
                                    </td>
                                    <td className="px-4 py-3 text-white">
                                        {invite.type}
                                    </td>
                                    <td className="px-4 py-3 text-future-gray">
                                        {invite.duration ? `${invite.duration} days` : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {invite.isUsed ? (
                                            <span className="text-risk-high text-xs font-bold">USED</span>
                                        ) : (
                                            <span className="text-momentum-green text-xs font-bold">ACTIVE</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-future-gray">
                                        {invite.usedByUser ? (
                                            <div>
                                                <div className="text-white">{invite.usedByUser.fullName}</div>
                                                <div className="text-xs">{invite.usedByUser.email}</div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {invites.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-future-gray">No invite codes generated yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Referrers */}
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Top Referrers</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-future-gray uppercase bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">User</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Referrals</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topReferrers.map((referrer) => (
                                    <tr key={referrer.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">
                                            <div>{referrer.fullName}</div>
                                            <div className="text-xs text-future-gray">{referrer.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-momentum-green">
                                            {referrer.referralCount}
                                        </td>
                                    </tr>
                                ))}
                                {stats.topReferrers.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-8 text-center text-future-gray">No referrers yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Recent Referrals */}
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Recent Referrals</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-future-gray uppercase bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Referred User</th>
                                    <th className="px-4 py-3">Referrer</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Reward</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentReferrals.map((referral) => (
                                    <tr key={referral.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">
                                            <div>{referral.fullName}</div>
                                            <div className="text-xs text-future-gray">{new Date(referral.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-4 py-3 text-future-gray">
                                            {referral.referrer?.fullName || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${referral.subscriptionStatus === 'ACTIVE' ? 'bg-momentum-green/10 text-momentum-green' :
                                                referral.subscriptionStatus === 'TRIALING' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-red-500/10 text-red-400'
                                                }`}>
                                                {referral.subscriptionStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {referral.hasRewardedReferrer ? (
                                                <span className="text-momentum-green text-xs font-bold">PAID</span>
                                            ) : (
                                                <span className="text-future-gray text-xs">PENDING</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {stats.recentReferrals.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-future-gray">No referrals yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <GenerateInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                    // Keep modal open to show the code, or close it?
                    // The modal handles showing the code. We just refresh the list.
                }}
            />
        </div>
    );
};

export default ReferralDashboard;
