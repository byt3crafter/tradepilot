
import React from 'react';
import { Trade, TradeResult, Direction } from '../../../types';
import Card from '../../Card';
import { ArrowUpIcon } from '../../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../../icons/ArrowDownIcon';

interface RecentActivityProps {
    trades: Trade[];
}

const ActivityRow: React.FC<{ trade: Trade }> = ({ trade }) => {
    const isWin = trade.result === TradeResult.Win;
    const pl = trade.profitLoss ?? 0;

    return (
        <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/5 cursor-default">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${trade.direction === Direction.Buy ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
                    {trade.direction === Direction.Buy ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                </div>
                <div>
                    <div className="font-bold text-white text-sm">{trade.asset}</div>
                    <div className="text-xs text-secondary font-tech-mono">
                        {new Date(trade.exitDate || trade.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className={`font-tech-mono font-bold text-sm ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pl >= 0 ? '+' : ''}${Math.abs(pl).toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-secondary font-semibold">
                    {trade.result || 'OPEN'}
                </div>
            </div>
        </div>
    );
};

const RecentActivity: React.FC<RecentActivityProps> = ({ trades }) => {
    // Sort trades by date desc
    const sortedTrades = [...trades].sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime()).slice(0, 10);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <div className="p-2 mb-2">
                <h3 className="text-secondary text-xs font-orbitron uppercase tracking-widest">Recent Activity</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 sidebar-scrollbar flex flex-col gap-1">
                {sortedTrades.length > 0 ? (
                    sortedTrades.map(trade => <ActivityRow key={trade.id} trade={trade} />)
                ) : (
                    <div className="h-full flex items-center justify-center text-secondary text-xs">
                        No recent trades recorded.
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RecentActivity;
