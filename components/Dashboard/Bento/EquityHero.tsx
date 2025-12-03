
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../../Card';

interface EquityHeroProps {
  netPL: number;
  equityCurve: any[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0A0A0A]/90 backdrop-blur-md p-3 border border-white/10 rounded-lg shadow-xl text-xs">
        <p className="text-secondary font-orbitron mb-1">{data.date}</p>
        <div className="flex flex-col gap-1">
          <span className="font-tech-mono font-bold text-primary">
            Equity: ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className={`font-tech-mono ${data.pl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {data.pl >= 0 ? '+' : ''}${data.pl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const EquityHero: React.FC<EquityHeroProps> = ({ netPL, equityCurve }) => {
  const isPositive = netPL >= 0;
  const gradientId = "equityGradient";
  const lineColor = isPositive ? "#A1E3CB" : "#E08E8E"; // profit (mint) vs loss (coral)

  return (
    <Card className="h-[500px] flex flex-col relative overflow-hidden group">
      {/* Background Ambience */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${isPositive ? 'from-profit/5' : 'from-loss/5'} to-transparent rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-colors duration-500`} />

      <div className="relative z-10 flex-shrink-0 flex flex-col items-start justify-start p-6 pb-2">
        <h3 className="text-secondary text-xs font-orbitron uppercase tracking-widest mb-2">Net Profit / Loss</h3>
        <h1 className={`text-5xl md:text-6xl font-bold tracking-tight font-tech-mono mb-1 ${isPositive ? 'text-white' : 'text-white'}`}>
          {netPL < 0 ? '-' : ''}${Math.abs(netPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <span className={`px-3 py-1 rounded text-xs font-bold ${isPositive ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
          {isPositive ? 'ALL TIME PROFIT' : 'DRAWDOWN'}
        </span>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={equityCurve} margin={{ top: 10, right: 0, left: -60, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 10, dy: 10 }}
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default EquityHero;
