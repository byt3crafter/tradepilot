import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { MenuIcon } from '../components/icons/MenuIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import Button from '../components/ui/Button';
import Card from '../components/Card';
import { useUI } from '../context/UIContext';
import { useClerk } from '@clerk/clerk-react';
import MobileProfileMenu from '../components/ui/MobileProfileMenu';

const ReferralPage: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useAuth();
    const { isSidebarCollapsed } = useUI();
    const [copied, setCopied] = useState(false);
    const { openUserProfile } = useClerk();

    // The /invite/:userId route in App.tsx (UnauthenticatedApp) stores the user ID as a
    // referral code in localStorage and redirects the new user to /signup — this is the
    // correct referral flow.
    const referralLink = `${window.location.origin}/invite/${user?.id}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex h-screen bg-jtp-bg text-jtp-text font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-jtp-border bg-jtp-bg">
                    <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
                        <span className="font-sans font-bold text-sm text-jtp-text">JTradePilot</span>
                    </a>
                    <div className="flex items-center gap-3">
                        <MobileProfileMenu />
                        <button onClick={() => setIsSidebarOpen(true)} className="text-jtp-textMuted">
                            <MenuIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-12 lg:p-16 pb-24 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-8">

                        {/* Header */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-jtp-profit text-sm font-bold uppercase tracking-wider">
                                <UsersIcon className="w-4 h-4" />
                                Partner Program
                            </div>
                            <h1 className="text-3xl font-sans font-bold text-jtp-text">
                                Refer Friends. Get Paid in Pro Time.
                            </h1>
                            <p className="text-jtp-textMuted max-w-2xl text-lg">
                                Give your friends the <span className="text-jtp-text font-semibold">Early Supporter Deal</span>.
                                When they subscribe, you get <span className="text-jtp-profit font-bold">+1 Month of Pro</span> for free.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left Column: Link & Stats (7 cols) */}
                            <div className="lg:col-span-7 space-y-6">

                                {/* Link Card */}
                                <Card>
                                    <h3 className="text-xl font-bold text-jtp-text mb-2">Your Unique Invite Link</h3>
                                    <p className="text-jtp-textMuted mb-6">Share this link to track your referrals automatically.</p>

                                    <div className="flex items-center gap-2 bg-jtp-control border border-jtp-borderStrong rounded-jtp-md p-2 pl-4">
                                        <code className="flex-1 font-mono text-sm text-jtp-profit truncate">
                                            {referralLink}
                                        </code>
                                        <Button
                                            onClick={copyToClipboard}
                                            className={`shrink-0 px-3 py-2 rounded-jtp-md font-bold transition-all ${copied
                                                ? "bg-jtp-profit text-jtp-bg hover:opacity-90"
                                                : "bg-jtp-blue text-white hover:bg-jtp-blueHover"
                                                }`}
                                        >
                                            {copied ? "Copied!" : "Copy Link"}
                                        </Button>
                                    </div>
                                </Card>

                                {/* Stats Grid */}
                                {/* TODO: Wire to a user-facing referral stats endpoint once available.
                                     Currently no user-facing endpoint exists (getReferralStats is admin-only
                                     at /api/admin/referrals/stats). Showing placeholder until implemented. */}
                                <div className="grid grid-cols-2 gap-6">
                                    <Card className="flex flex-col items-center justify-center text-center py-8">
                                        <span className="text-4xl font-bold text-jtp-textMuted mb-2">—</span>
                                        <span className="text-xs font-bold text-jtp-textDim uppercase tracking-widest">Friends Joined</span>
                                        <span className="text-[10px] text-jtp-textFaint mt-1">coming soon</span>
                                    </Card>
                                    <Card className="flex flex-col items-center justify-center text-center py-8">
                                        <span className="text-4xl font-bold text-jtp-textMuted mb-2">—</span>
                                        <span className="text-xs font-bold text-jtp-textDim uppercase tracking-widest">Free Months Earned</span>
                                        <span className="text-[10px] text-jtp-textFaint mt-1">coming soon</span>
                                    </Card>
                                </div>

                            </div>

                            {/* Right Column: How it Works (5 cols) */}
                            <div className="lg:col-span-5">
                                <Card className="h-full">
                                    <h3 className="text-xl font-bold text-jtp-text mb-6">How it works</h3>

                                    <div className="space-y-8 relative">
                                        {/* Connecting Line */}
                                        <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-jtp-border" />

                                        {/* Step 1 */}
                                        <div className="relative flex gap-6">
                                            <div className="w-8 h-8 rounded-full bg-jtp-raised border border-jtp-borderStrong flex items-center justify-center text-sm font-bold text-jtp-text shrink-0 z-10">1</div>
                                            <div>
                                                <h4 className="text-jtp-text font-bold mb-1">Share your link</h4>
                                                <p className="text-sm text-jtp-textMuted leading-relaxed">
                                                    Send your unique link to trader friends or share it on your social channels.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="relative flex gap-6">
                                            <div className="w-8 h-8 rounded-full bg-jtp-raised border border-jtp-borderStrong flex items-center justify-center text-sm font-bold text-jtp-text shrink-0 z-10">2</div>
                                            <div>
                                                <h4 className="text-jtp-text font-bold mb-1">They get the VIP Deal</h4>
                                                <p className="text-sm text-jtp-textMuted leading-relaxed">
                                                    Your friends lock in the <span className="text-jtp-text">$5.99/mo (or $60/yr) price</span> for life.
                                                </p>
                                                <div className="mt-2 inline-block px-2 py-0.5 bg-jtp-profit/10 rounded-jtp-xs border border-jtp-profit/20 text-[10px] font-bold text-jtp-profit uppercase tracking-wider">
                                                    Early Supporter Status
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="relative flex gap-6">
                                            <div className="w-8 h-8 rounded-full bg-jtp-profit text-jtp-bg flex items-center justify-center text-sm font-bold shrink-0 z-10">3</div>
                                            <div>
                                                <h4 className="text-jtp-text font-bold mb-1">You get paid</h4>
                                                <p className="text-sm text-jtp-textMuted leading-relaxed">
                                                    As soon as they make their first payment, we automatically add <span className="text-jtp-profit font-bold">+1 Month</span> to your subscription.
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </Card>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ReferralPage;
