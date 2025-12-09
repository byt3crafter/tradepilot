import React from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { DashboardIcon } from '../components/icons/DashboardIcon';
import { JournalIcon } from '../components/icons/JournalIcon';
import { AnalyticsIcon } from '../components/icons/AnalyticsIcon';
import { PlaybookIcon } from '../components/icons/PlaybookIcon';
import { BrainIcon } from '../components/icons/BrainIcon';

const FeaturesPage: React.FC = () => {
    return (
        <div className="flex flex-col h-screen bg-void text-white font-sans selection:bg-photonic-blue/30">
            <PublicNavbar />

            <main className="flex-1 overflow-y-auto pt-24 pb-16">
                {/* Hero Section */}
                <section className="relative px-6 lg:px-8 max-w-7xl mx-auto text-center mb-24">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-photonic-blue/20 rounded-full blur-[120px] -z-10 opacity-50 pointer-events-none" />

                    <h1 className="text-4xl md:text-6xl font-bold font-orbitron tracking-wider mb-6 bg-gradient-to-r from-white via-photonic-blue to-white bg-clip-text text-transparent">
                        ADVANCED TRADING TOOLS
                    </h1>
                    <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
                        TradePilot equips you with institutional-grade analytics, AI-driven insights, and a comprehensive journaling system to elevate your trading performance.
                    </p>
                </section>

                {/* Features Grid */}
                <section className="px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Feature 1: Dashboard */}
                    <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-photonic-blue/50 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DashboardIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-photonic-blue/10 flex items-center justify-center mb-6 text-photonic-blue group-hover:scale-110 transition-transform duration-300">
                            <DashboardIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-orbitron mb-3 text-white">Command Center</h3>
                        <p className="text-secondary leading-relaxed">
                            A unified dashboard aggregating real-time metrics, active accounts, and daily performance snapshots. Monitor your equity curve and key KPIs at a glance.
                        </p>
                    </div>

                    {/* Feature 2: Trade Journal */}
                    <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-momentum-green/50 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <JournalIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-momentum-green/10 flex items-center justify-center mb-6 text-momentum-green group-hover:scale-110 transition-transform duration-300">
                            <JournalIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-orbitron mb-3 text-white">Smart Journaling</h3>
                        <p className="text-secondary leading-relaxed">
                            Log trades with precision. Tag setups, emotions, and mistakes. Our journal helps you identify patterns in your behavior and refine your strategy execution.
                        </p>
                    </div>

                    {/* Feature 3: Analytics */}
                    <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AnalyticsIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform duration-300">
                            <AnalyticsIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-orbitron mb-3 text-white">Deep Analytics</h3>
                        <p className="text-secondary leading-relaxed">
                            Visualize your edge. Analyze win rates, profit factors, and drawdown periods. Filter performance by session, asset class, or specific playbooks.
                        </p>
                    </div>

                    {/* Feature 4: Playbooks */}
                    <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-orange-500/50 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <PlaybookIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-6 text-orange-500 group-hover:scale-110 transition-transform duration-300">
                            <PlaybookIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-orbitron mb-3 text-white">Strategy Playbooks</h3>
                        <p className="text-secondary leading-relaxed">
                            Codify your edge. Build and refine detailed playbooks for every setup you trade. Track the performance of each strategy independently.
                        </p>
                    </div>

                    {/* Feature 5: AI Analysis */}
                    <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrainIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                            <BrainIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-orbitron mb-3 text-white">AI Insights</h3>
                        <p className="text-secondary leading-relaxed">
                            Leverage machine learning to analyze your trading history. Get unbiased feedback on your habits, risk management, and potential areas for improvement.
                        </p>
                    </div>

                    {/* Feature 6: Prop Firm Ready */}
                    <div className="group p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-red-500/50 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-6 text-red-500 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold font-orbitron mb-3 text-white">Prop Firm Templates</h3>
                        <p className="text-secondary leading-relaxed">
                            Built for funded traders. Use pre-configured templates for major prop firms to track your drawdown, profit targets, and consistency rules automatically.
                        </p>
                    </div>

                </section>

                {/* CTA Section */}
                <section className="mt-24 px-6 text-center">
                    <div className="max-w-4xl mx-auto p-12 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
                        <h2 className="text-3xl font-bold font-orbitron mb-6 text-white">Ready to Professionalize Your Trading?</h2>
                        <p className="text-secondary mb-8 max-w-xl mx-auto">
                            Join thousands of traders who have elevated their game with TradePilot. Start your journey today.
                        </p>
                        <a
                            href="/signup"
                            className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-black uppercase tracking-widest bg-white hover:bg-gray-200 transition-colors rounded-none clip-path-slant"
                            style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)' }}
                        >
                            Get Started Now
                        </a>
                    </div>
                </section>
                <PublicFooter />
            </main>
        </div>
    );
};

export default FeaturesPage;