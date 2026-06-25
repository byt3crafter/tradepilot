import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Trade, BrokerAccount } from '../../../types';

interface DashEquityCurveProps {
  closedTrades: Trade[];
  account?: BrokerAccount | null;
}

interface ChartPoint {
  dateMs: number;
  date: string;
  equity: number;   // cumulative net P&L ($)
  r: number;        // cumulative realised R
  ddDollar: number; // drawdown from running peak ($, ≤ 0)
  ddR: number;      // drawdown from running peak (R, ≤ 0)
}

const netOf = (t: Trade) => (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);

const fmtMoney = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `$${a.toFixed(0)}`;
  return v < 0 ? `-${s}` : s;
};
const fmtR = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}R`;

const Tip: React.FC<any> = ({ active, payload, isR }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartPoint;
  const val = isR ? d.r : d.equity;
  const dd = isR ? d.ddR : d.ddDollar;
  const valStr = isR ? fmtR(val) : `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
  const ddStr = isR ? `${dd.toFixed(1)}R` : `-$${Math.abs(dd).toFixed(2)}`;
  return (
    <div className="bg-jtp-panel border border-jtp-borderStrong rounded-jtp-md px-3 py-2 shadow-jtp-drawer">
      <div className="text-jtp-xs text-jtp-textDim mb-1">{d.date}</div>
      <div className={`font-mono text-jtp-md font-semibold ${val >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>{valStr}</div>
      {dd < 0 && <div className="font-mono text-jtp-xs text-jtp-loss mt-0.5">drawdown {ddStr}</div>}
    </div>
  );
};

const DashEquityCurve: React.FC<DashEquityCurveProps> = ({ closedTrades }) => {
  const [isR, setIsR] = useState(false);

  const data = useMemo<ChartPoint[]>(() => {
    const sorted = [...closedTrades].sort((a, b) => {
      const ax = new Date(a.exitDate ?? a.entryDate).getTime();
      const bx = new Date(b.exitDate ?? b.entryDate).getTime();
      return ax - bx;
    });
    let eq = 0, r = 0, peak = 0, peakR = 0;
    return sorted.map((t) => {
      eq += netOf(t);
      r += t.realisedR ?? 0;
      peak = Math.max(peak, eq);
      peakR = Math.max(peakR, r);
      const dObj = new Date(t.exitDate ?? t.entryDate);
      return {
        dateMs: dObj.getTime(),
        date: dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        equity: eq,
        r,
        ddDollar: eq - peak,
        ddR: r - peakR,
      };
    });
  }, [closedTrades]);

  const valueKey = isR ? 'r' : 'equity';
  const positive = data.length ? (isR ? data[data.length - 1].r : data[data.length - 1].equity) >= 0 : true;
  const stroke = positive ? '#5b8def' : '#5b8def';

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-jtp-md font-semibold text-jtp-text">Equity Curve</h3>
        <div className="flex bg-jtp-control border border-jtp-borderStrong rounded-jtp-md overflow-hidden text-jtp-xs">
          <button onClick={() => setIsR(false)} className={`px-2.5 py-1 ${!isR ? 'bg-jtp-blue text-white' : 'text-jtp-textDim'}`}>$</button>
          <button onClick={() => setIsR(true)} className={`px-2.5 py-1 ${isR ? 'bg-jtp-blue text-white' : 'text-jtp-textDim'}`}>R</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-jtp-textDim text-jtp-sm">No closed trades yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dateMs"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ms) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#1c2128' }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              tickFormatter={(v) => (isR ? `${v}R` : fmtMoney(v))}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ReferenceLine y={0} stroke="#2a2f37" strokeDasharray="3 3" />
            <Tooltip content={<Tip isR={isR} />} cursor={{ stroke: '#5b8def', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area
              type="linear"
              dataKey={valueKey}
              stroke={stroke}
              strokeWidth={2}
              fill="url(#eqFill)"
              dot={false}
              activeDot={{ r: 3, fill: stroke }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DashEquityCurve;
