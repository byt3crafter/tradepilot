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

const TimeBarChart: React.FC<{ data: PerformanceByTimeType[], dataKey: string }> = ({ data, dataKey }) => (
  <ResponsiveContainer width="100%" height={250}>
    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 191, 255, 0.1)" />
      <XAxis dataKey="key" tick={{ fill: '#8899A6', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#8899A6' }} />
      <YAxis tick={{ fill: '#8899A6', fontSize: 10 }} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={{ stroke: '#8899A6' }} />
      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 191, 255, 0.1)' }} />
      <Bar dataKey={dataKey}>
        {data.map((entry, index) => (
          <Recharts.Cell key={`cell-${index}`} fill={entry.netPL >= 0 ? '#10b981' : '#ef4444'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);


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
