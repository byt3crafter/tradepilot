
import React from 'react';
import Card from '../../Card';

interface StatGridProps {
  winRate: number;
  profitFactor: number;
  currentStreak: number;
}

const MinimalStatCard: React.FC<{ label: string; value: React.ReactNode; subValue?: string; accent?: 'profit' | 'loss' | 'neutral' }> = ({ label, value, subValue, accent = 'neutral' }) => {
    const accentColors = {
        profit: 'text-profit',
        loss: 'text-loss',
        neutral: 'text-white'
    };

    return (
        <Card className="flex flex-col justify-center items-center text-center p-4 relative overflow-hidden h-[140px]">
            <h4 className="text-xs text-secondary font-orbitron uppercase tracking-wider mb-2 z-10">{label}</h4>
            <div className={`text-3xl font-bold font-tech-mono z-10 ${accentColors[accent]}`}>
                {value}
            </div>
            {subValue && <div className="text-xs text-secondary mt-1 z-10">{subValue}</div>}
            
            {/* Subtle glow effect based on accent */}
            <div className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-10 
                ${accent === 'profit' ? 'bg-profit' : accent === 'loss' ? 'bg-loss' : 'bg-white'} 
            `} />
        </Card>
    );
};

// --- Mini Visualizations ---

const WinRateRing: React.FC<{ rate: number }> = ({ rate }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (rate / 100) * circumference;
    
    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="transparent" />
                <circle 
                    cx="40" cy="40" r={radius} 
                    stroke={rate >= 50 ? '#A1E3CB' : '#E08E8E'} 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round"
                />
            </svg>
            <span className="absolute text-sm font-bold font-tech-mono text-white">{rate.toFixed(0)}%</span>
        </div>
    );
};

const ProfitFactorGauge: React.FC<{ pf: number }> = ({ pf }) => {
    // PF 0 to 3+
    const clamped = Math.min(Math.max(pf, 0), 4); // Clamp at 4 for display
    const percent = clamped / 4; 
    const rotation = -90 + (percent * 180); // -90deg to +90deg

    return (
        <div className="relative w-24 h-12 overflow-hidden flex items-end justify-center mb-2">
            <div className="w-20 h-20 border-8 border-white/10 rounded-full box-border" />
            <div 
                className="absolute bottom-0 w-20 h-20 border-8 border-transparent border-t-profit border-r-profit rounded-full box-border"
                style={{ 
                    transform: `rotate(${rotation}deg)`, 
                    opacity: pf > 0 ? 1 : 0.2 
                }} 
            />
            <span className="absolute bottom-0 text-lg font-bold font-tech-mono text-white">{pf === Infinity ? '∞' : pf.toFixed(2)}</span>
        </div>
    );
};


const StatGrid: React.FC<StatGridProps> = ({ winRate, profitFactor, currentStreak }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <MinimalStatCard 
        label="Win Rate"
        value={<WinRateRing rate={winRate} />}
        accent={winRate >= 50 ? 'profit' : 'loss'}
      />
      <MinimalStatCard 
        label="Profit Factor"
        value={<ProfitFactorGauge pf={profitFactor} />}
        subValue={profitFactor > 1.5 ? "Excellent" : profitFactor > 1 ? "Profitable" : "Needs Work"}
        accent={profitFactor > 1 ? 'profit' : 'neutral'}
      />
      <MinimalStatCard 
        label="Active Streak"
        value={`${currentStreak > 0 ? '+' : ''}${currentStreak}`}
        subValue={currentStreak > 0 ? "Winning Streak" : currentStreak < 0 ? "Losing Streak" : "Neutral"}
        accent={currentStreak > 0 ? 'profit' : currentStreak < 0 ? 'loss' : 'neutral'}
      />
    </div>
  );
};

export default StatGrid;
