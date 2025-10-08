import React from 'react';
import { PerformanceByAsset as PerformanceByAssetType } from '../../types';

interface PerformanceByAssetProps {
  data: PerformanceByAssetType[];
}

const PerformanceByAsset: React.FC<PerformanceByAssetProps> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-future-gray py-8">No trades to analyze.</p>;
  }

  return (
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
          {data.sort((a,b) => b.netPL - a.netPL).map(asset => (
            <tr key={asset.symbol} className="border-b border-future-panel/50">
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
  );
};

export default PerformanceByAsset;
