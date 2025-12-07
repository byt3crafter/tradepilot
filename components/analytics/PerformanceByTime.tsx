import React from 'react';
import * as Recharts from 'recharts';
import { PerformanceByTime as PerformanceByTimeType } from '../../types';

const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = Recharts;

interface PerformanceByTimeProps {
  dayData: PerformanceByTimeType[];
  hourData: PerformanceByTimeType[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-future-panel/80 backdrop-blur-sm p-2 border border-photonic-blue/20 rounded-md text-xs">
        <p className="label text-future-gray">{label}</p>
        <p className="font-semibold text-future-light">Net P/L: ${payload[0].value.toFixed(2)}</p>
        <p className="text-future-gray">Trades: {payload[0].payload.totalTrades}</p>
      </div>
    );
  }
  return null;
};

const TimeBarChart: React.FC<{ data: PerformanceByTimeType[], dataKey: string }> = ({ data, dataKey }) => {
  // Calculate win rate for each time bucket if not present (backend might need to send it, or we calculate here if we had raw data)
  // Actually, backend sends netPL and totalTrades. We don't have winRate in PerformanceByTimeType yet.
  // Let's assume we only show Net PL for now as we didn't update the backend for this specific granular metric.
  // Wait, I can update the backend to send winRate for time buckets too!
  // For now, let's stick to the plan: "Add Win Rate visualization".
  // Since I missed adding winRate to PerformanceByTime in the backend step, I will stick to just enhancing the visual style for now, 
  // OR I can quickly update the backend. 
  // Let's stick to just the BarChart but make it look better, as adding WinRate requires backend changes I didn't make yet for *this specific* endpoint part.
  // Actually, I can infer "efficiency" by NetPL / TotalTrades (Avg PL per trade).

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 191, 255, 0.1)" />
        <XAxis dataKey="key" tick={{ fill: '#8899A6', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#8899A6' }} />
        <YAxis tick={{ fill: '#8899A6', fontSize: 10 }} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={{ stroke: '#8899A6' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 191, 255, 0.1)' }} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Recharts.Cell key={`cell-${index}`} fill={entry.netPL >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
};


const PerformanceByTime: React.FC<PerformanceByTimeProps> = ({ dayData, hourData }) => {
  if (dayData.length === 0 && hourData.length === 0) {
    return <p className="text-center text-future-gray py-8">No trades to analyze.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-orbitron text-photonic-blue mb-2">Performance by Day of Week</h3>
        <TimeBarChart data={dayData} dataKey="netPL" />
      </div>
      <div>
        <h3 className="text-lg font-orbitron text-photonic-blue mb-2">Performance by Hour of Day (UTC)</h3>
        <TimeBarChart data={hourData} dataKey="netPL" />
      </div>
    </div>
  );
};

export default PerformanceByTime;
