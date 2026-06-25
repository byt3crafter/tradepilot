import React from 'react';

import PublicLink from './PublicLink';
import { XIcon } from './icons/XIcon';

const PublicFooter: React.FC = () => {
    return (
        <footer className="border-t border-jtp-border bg-jtp-bg mt-16 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="text-jtp-textDim text-sm">
                        © 2026 JTradePilot. Master your trading with intelligent insights.
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 text-sm items-center">
                        <a href="https://x.com/jtradepilot" target="_blank" rel="noopener noreferrer" className="text-jtp-textMuted hover:text-jtp-text transition-colors">
                            <XIcon className="w-5 h-5" />
                        </a>

                        <PublicLink href="/privacy" className="text-jtp-textMuted hover:text-jtp-text transition-colors">
                            Privacy
                        </PublicLink>
                        <PublicLink href="/terms" className="text-jtp-textMuted hover:text-jtp-text transition-colors">
                            Terms
                        </PublicLink>
                        <PublicLink href="/refund-policy" className="text-jtp-textMuted hover:text-jtp-text transition-colors">
                            Refund Policy
                        </PublicLink>
                        <PublicLink href="/risk-disclaimer" className="text-jtp-textMuted hover:text-jtp-text transition-colors">
                            Disclaimer
                        </PublicLink>
                        <PublicLink href="/faq" className="text-jtp-textMuted hover:text-jtp-text transition-colors">
                            FAQ
                        </PublicLink>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default PublicFooter;
