import React from 'react';
import { PerformanceByAsset as PerformanceByAssetType } from '../../types';

interface PerformanceByAssetProps {
  data: PerformanceByAssetType[];
}

import * as Recharts from 'recharts';

const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } = Recharts;

const PerformanceByAsset: React.FC<PerformanceByAssetProps> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-future-gray py-8">No trades to analyze.</p>;
  }

  const sortedData = [...data].sort((a, b) => b.netPL - a.netPL);

  return (
    <div className="space-y-8">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 191, 255, 0.1)" />
            <XAxis dataKey="symbol" tick={{ fill: '#8899A6', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#8899A6' }} />
            <YAxis tick={{ fill: '#8899A6', fontSize: 10 }} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={{ stroke: '#8899A6' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(12, 13, 14, 0.9)', borderColor: 'rgba(0, 191, 255, 0.2)', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              cursor={{ fill: 'rgba(0, 191, 255, 0.1)' }}
            />
            <Bar dataKey="netPL">
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.netPL >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto table-scrollbar">
        <table className="w-full text-sm">
          <thead className="border-b border-photonic-blue/30">
            <tr>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Symbol</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Total Trades</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Win Rate</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Total Pips</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Net P/L</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(asset => (
              <tr key={asset.symbol} className="border-b border-future-panel/50 hover:bg-white/5 transition-colors">
                <td className="p-3 font-semibold font-tech-mono text-future-light">{asset.symbol}</td>
                <td className="p-3 font-tech-mono text-future-gray">{asset.totalTrades}</td>
                <td className="p-3 font-tech-mono text-future-gray">{asset.winRate.toFixed(1)}%</td>
                <td className={`p-3 font-tech-mono font-semibold ${asset.totalPips > 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
                  {asset.totalPips.toFixed(1)}
                </td>
                <td className={`p-3 font-tech-mono font-semibold ${asset.netPL >= 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
                  {asset.netPL < 0 ? '-' : ''}${Math.abs(asset.netPL).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceByAsset;
