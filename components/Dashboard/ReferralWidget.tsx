import React, { useState } from 'react';
import Card from '../Card';
import { useAuth } from '../../context/AuthContext';
import { UsersIcon } from '../icons/UsersIcon';
import Button from '../ui/Button';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

const ReferralWidget: React.FC = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    if (!user) return null;

    const referralLink = `https://jtradepilot.com?ref=${user.id}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="bg-gradient-to-br from-surface to-surface-highlight border-momentum-green/20">
            <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-momentum-green/10 rounded-lg">
                            <UsersIcon className="w-5 h-5 text-momentum-green" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Refer & Earn</h3>
                            <p className="text-xs text-future-gray">Get free months of Pro</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-momentum-green">
                            {/* Placeholder for now, ideally fetched from backend */}
                            0
                        </span>
                        <p className="text-[10px] uppercase tracking-wider text-future-gray">Months Earned</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-future-light">
                        Share your link. Every friend who joins gets the <span className="text-momentum-green font-semibold">Early Supporter Deal</span> (30 days free + $5/mo forever), and you get <span className="text-white font-semibold">+1 month free</span>.
                    </p>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-future-gray truncate font-mono">
                            {referralLink}
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={copyToClipboard}
                            className={copied ? "text-momentum-green border-momentum-green/50" : ""}
                        >
                            {copied ? <CheckCircleIcon className="w-4 h-4" /> : "Copy"}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ReferralWidget;
