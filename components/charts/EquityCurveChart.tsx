import React from 'react';
import { EquityDataPoint } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface EquityCurveChartProps {
  data: EquityDataPoint[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-future-panel/80 backdrop-blur-sm p-2 border border-photonic-blue/20 rounded-md text-xs">
        <p className="label text-future-gray">{`Date: ${label}`}</p>
        <p className="intro font-semibold text-future-light">{`P&L : $${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="#00BFFF" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 191, 255, 0.1)" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#8899A6', fontSize: 10 }} 
          tickLine={{ stroke: '#8899A6' }}
          axisLine={{ stroke: '#8899A6' }}
        />
        <YAxis 
          tick={{ fill: '#8899A6', fontSize: 10 }}
          tickLine={{ stroke: '#8899A6' }}
          axisLine={{ stroke: '#8899A6' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="cumulativePL" 
          stroke="#00BFFF" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorUv)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default EquityCurveChart;