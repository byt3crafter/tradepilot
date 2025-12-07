import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { MenuIcon } from '../components/icons/MenuIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import Button from '../components/ui/Button';
import Card from '../components/Card';
import { useUI } from '../context/UIContext';
import { UserButton } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';

const ReferralPage: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useAuth();
    const { isSidebarCollapsed } = useUI();
    const [copied, setCopied] = useState(false);

    const referralLink = `${window.location.origin}/invite/${user?.id}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex h-screen bg-[#08090A] text-white font-sans overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#08090A]">
                    <div className="flex items-center gap-2">
                        <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
                        <span className="font-orbitron font-bold text-sm">JTradePilot</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserButton
                            appearance={{
                                baseTheme: dark,
                                elements: {
                                    avatarBox: "w-8 h-8 rounded-full border border-white/10",
                                    userButtonPopoverCard: "bg-[#08090A] border border-white/10 shadow-xl",
                                    userButtonPopoverFooter: "hidden",
                                    userButtonTrigger: "focus:shadow-none"
                                }
                            }}
                        />
                        <button onClick={() => setIsSidebarOpen(true)} className="text-secondary">
                            <MenuIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16">
                    <div className="max-w-6xl mx-auto space-y-8">

                        {/* Header */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-momentum-green text-sm font-bold uppercase tracking-wider">
                                <UsersIcon className="w-4 h-4" />
                                Partner Program
                            </div>
                            <h1 className="text-3xl font-orbitron font-bold text-white">
                                Refer Friends. Get Paid in Pro Time.
                            </h1>
                            <p className="text-future-gray max-w-2xl text-lg">
                                Give your friends the <span className="text-white font-semibold">Early Supporter Deal</span>.
                                When they subscribe, you get <span className="text-momentum-green font-bold">+1 Month of Pro</span> for free.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left Column: Link & Stats (7 cols) */}
                            <div className="lg:col-span-7 space-y-6">

                                {/* Link Card */}
                                <Card>
                                    <h3 className="text-xl font-bold text-white mb-2">Your Unique Invite Link</h3>
                                    <p className="text-future-gray mb-6">Share this link to track your referrals automatically.</p>

                                    <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-md p-2 pl-4">
                                        <code className="flex-1 font-mono text-sm text-momentum-green truncate">
                                            {referralLink}
                                        </code>
                                        <Button
                                            onClick={copyToClipboard}
                                            className={`shrink-0 px-3 py-2 rounded-md font-bold transition-all ${copied
                                                ? "bg-momentum-green text-black hover:bg-momentum-green"
                                                : "bg-white text-black hover:bg-gray-200"
                                                }`}
                                        >
                                            {copied ? "Copied!" : "Copy Link"}
                                        </Button>
                                    </div>
                                </Card>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    <Card className="flex flex-col items-center justify-center text-center py-8">
                                        <span className="text-4xl font-bold text-white mb-2">0</span>
                                        <span className="text-xs font-bold text-future-gray uppercase tracking-widest">Friends Joined</span>
                                    </Card>
                                    <Card className="flex flex-col items-center justify-center text-center py-8">
                                        <span className="text-4xl font-bold text-momentum-green mb-2">0</span>
                                        <span className="text-xs font-bold text-future-gray uppercase tracking-widest">Free Months Earned</span>
                                    </Card>
                                </div>

                            </div>

                            {/* Right Column: How it Works (5 cols) */}
                            <div className="lg:col-span-5">
                                <Card className="h-full">
                                    <h3 className="text-xl font-bold text-white mb-6">How it works</h3>

                                    <div className="space-y-8 relative">
                                        {/* Connecting Line */}
                                        <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-white/10" />

                                        {/* Step 1 */}
                                        <div className="relative flex gap-6">
                                            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0 z-10">1</div>
                                            <div>
                                                <h4 className="text-white font-bold mb-1">Share your link</h4>
                                                <p className="text-sm text-future-gray leading-relaxed">
                                                    Send your unique link to trader friends or share it on your social channels.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="relative flex gap-6">
                                            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0 z-10">2</div>
                                            <div>
                                                <h4 className="text-white font-bold mb-1">They get the VIP Deal</h4>
                                                <p className="text-sm text-future-gray leading-relaxed">
                                                    Your friends unlock a <span className="text-white">30-day free trial</span> and lock in the <span className="text-white">$5/mo price</span> for life.
                                                </p>
                                                <div className="mt-2 inline-block px-2 py-0.5 bg-momentum-green/10 rounded border border-momentum-green/20 text-[10px] font-bold text-momentum-green uppercase tracking-wider">
                                                    Early Supporter Status
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="relative flex gap-6">
                                            <div className="w-8 h-8 rounded-full bg-momentum-green text-black flex items-center justify-center text-sm font-bold shrink-0 z-10">3</div>
                                            <div>
                                                <h4 className="text-white font-bold mb-1">You get paid</h4>
                                                <p className="text-sm text-future-gray leading-relaxed">
                                                    As soon as they make their first payment, we automatically add <span className="text-momentum-green font-bold">+1 Month</span> to your subscription.
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
