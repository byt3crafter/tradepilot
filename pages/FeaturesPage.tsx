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
        <div className="flex flex-col h-screen bg-jtp-bg text-jtp-text font-sans selection:bg-jtp-blue/30">
            <PublicNavbar />

            <main className="flex-1 overflow-y-auto pt-24 pb-16">
                {/* Hero Section */}
                <section className="relative px-6 lg:px-8 max-w-7xl mx-auto text-center mb-24">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-jtp-blue/10 rounded-full blur-[120px] -z-10 opacity-40 pointer-events-none" />

                    <h1 className="text-4xl md:text-6xl font-bold font-sans tracking-tight mb-6 text-jtp-text">
                        ADVANCED TRADING TOOLS
                    </h1>
                    <p className="text-lg md:text-xl text-jtp-textMuted max-w-2xl mx-auto leading-relaxed">
                        JTradePilot equips you with institutional-grade analytics, AI-driven insights, and a comprehensive journaling system to elevate your trading performance.
                    </p>
                </section>

                {/* Features Grid */}
                <section className="px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Feature 1: Dashboard */}
                    <div className="group p-8 rounded-jtp-panel bg-jtp-panel border border-jtp-border hover:border-jtp-blue/50 hover:bg-jtp-raised transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DashboardIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-jtp-lg bg-jtp-blue/10 flex items-center justify-center mb-6 text-jtp-blue group-hover:scale-110 transition-transform duration-300">
                            <DashboardIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-sans mb-3 text-jtp-text">Command Center</h3>
                        <p className="text-jtp-textMuted leading-relaxed">
                            A unified dashboard aggregating real-time metrics, active accounts, and daily performance snapshots. Monitor your equity curve and key KPIs at a glance.
                        </p>
                    </div>

                    {/* Feature 2: Trade Journal */}
                    <div className="group p-8 rounded-jtp-panel bg-jtp-panel border border-jtp-border hover:border-jtp-profit/50 hover:bg-jtp-raised transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <JournalIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-jtp-lg bg-jtp-profit/10 flex items-center justify-center mb-6 text-jtp-profit group-hover:scale-110 transition-transform duration-300">
                            <JournalIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-sans mb-3 text-jtp-text">Smart Journaling</h3>
                        <p className="text-jtp-textMuted leading-relaxed">
                            Log trades with precision. Tag setups, emotions, and mistakes. Our journal helps you identify patterns in your behavior and refine your strategy execution.
                        </p>
                    </div>

                    {/* Feature 3: Analytics */}
                    <div className="group p-8 rounded-jtp-panel bg-jtp-panel border border-jtp-border hover:border-purple-500/50 hover:bg-jtp-raised transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AnalyticsIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-jtp-lg bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                            <AnalyticsIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-sans mb-3 text-jtp-text">Deep Analytics</h3>
                        <p className="text-jtp-textMuted leading-relaxed">
                            Visualize your edge. Analyze win rates, profit factors, and drawdown periods. Filter performance by session, asset class, or specific playbooks.
                        </p>
                    </div>

                    {/* Feature 4: Playbooks */}
                    <div className="group p-8 rounded-jtp-panel bg-jtp-panel border border-jtp-border hover:border-orange-500/50 hover:bg-jtp-raised transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <PlaybookIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-jtp-lg bg-orange-500/10 flex items-center justify-center mb-6 text-orange-400 group-hover:scale-110 transition-transform duration-300">
                            <PlaybookIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-sans mb-3 text-jtp-text">Strategy Playbooks</h3>
                        <p className="text-jtp-textMuted leading-relaxed">
                            Codify your edge. Build and refine detailed playbooks for every setup you trade. Track the performance of each strategy independently.
                        </p>
                    </div>

                    {/* Feature 5: AI Analysis */}
                    <div className="group p-8 rounded-jtp-panel bg-jtp-panel border border-jtp-border hover:border-cyan-400/50 hover:bg-jtp-raised transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrainIcon className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-jtp-lg bg-cyan-400/10 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                            <BrainIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold font-sans mb-3 text-jtp-text">AI Insights</h3>
                        <p className="text-jtp-textMuted leading-relaxed">
                            Leverage machine learning to analyze your trading history. Get unbiased feedback on your habits, risk management, and potential areas for improvement.
                        </p>
                    </div>

                    {/* Feature 6: Prop Firm Ready */}
                    <div className="group p-8 rounded-jtp-panel bg-jtp-panel border border-jtp-border hover:border-jtp-loss/50 hover:bg-jtp-raised transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="w-12 h-12 rounded-jtp-lg bg-jtp-loss/10 flex items-center justify-center mb-6 text-jtp-loss group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold font-sans mb-3 text-jtp-text">Prop Firm Templates</h3>
                        <p className="text-jtp-textMuted leading-relaxed">
                            Built for funded traders. Use pre-configured templates for major prop firms to track your drawdown, profit targets, and consistency rules automatically.
                        </p>
                    </div>

                </section>

                {/* CTA Section */}
                <section className="mt-24 px-6 text-center">
                    <div className="max-w-4xl mx-auto p-12 rounded-jtp-panel bg-jtp-panel border border-jtp-border">
                        <h2 className="text-3xl font-bold font-sans mb-6 text-jtp-text">Ready to Professionalize Your Trading?</h2>
                        <p className="text-jtp-textMuted mb-8 max-w-xl mx-auto">
                            Join thousands of traders who have elevated their game with JTradePilot. Start your journey today.
                        </p>
                        <a
                            href="/signup"
                            className="inline-flex items-center justify-center px-8 py-3 text-sm font-bold text-white bg-jtp-blue hover:bg-jtp-blueHover transition-colors rounded-jtp-md"
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
