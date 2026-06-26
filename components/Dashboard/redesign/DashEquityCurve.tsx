import React, { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Trade, BrokerAccount } from '../../../types';

interface Props {
  closedTrades: Trade[];
  account?: BrokerAccount | null;
}

const netOf = (t: Trade) => (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);

interface Pt {
  ts: number;
  equity: number;
  r: number;
  ddD: number;
  ddR: number;
}

const fmtMoney = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `$${a.toFixed(0)}`;
  return v < 0 ? `-${s}` : s;
};

const DashEquityCurve: React.FC<Props> = ({ closedTrades }) => {
  const [isR, setIsR] = useState(false);

  const points = useMemo<Pt[]>(() => {
    const sorted = [...closedTrades].sort(
      (a, b) =>
        new Date(a.exitDate ?? a.entryDate).getTime() -
        new Date(b.exitDate ?? b.entryDate).getTime(),
    );
    let eq = 0, r = 0, peak = 0, peakR = 0;
    return sorted.map((t) => {
      eq += netOf(t);
      r += t.realisedR ?? 0;
      peak = Math.max(peak, eq);
      peakR = Math.max(peakR, r);
      return {
        ts: new Date(t.exitDate ?? t.entryDate).getTime(),
        equity: eq,
        r,
        ddD: eq - peak,
        ddR: r - peakR,
      };
    });
  }, [closedTrades]);

  const series = useMemo(
    () => [{ name: isR ? 'R' : 'Equity', data: points.map((p) => [p.ts, +(isR ? p.r : p.equity).toFixed(2)]) }],
    [points, isR],
  );

  const options = useMemo(
    () => ({
      chart: {
        type: 'area' as const,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: false },
        fontFamily: 'Inter, system-ui, sans-serif',
        parentHeightOffset: 0,
      },
      theme: { mode: 'dark' as const },
      colors: ['#5b8def'],
      stroke: { curve: 'straight' as const, width: 2 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: 'rgba(255,255,255,0.05)',
        strokeDashArray: 0,
        xaxis: { lines: { show: false } },
        padding: { left: 8, right: 0, top: 0, bottom: 0 },
      },
      xaxis: {
        type: 'datetime' as const,
        labels: { style: { colors: '#6b7280', fontSize: '11px' }, datetimeUTC: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        crosshairs: { stroke: { color: '#5b8def', dashArray: 4, width: 1 } },
      },
      yaxis: {
        opposite: true,
        labels: {
          style: { colors: '#6b7280', fontSize: '11px' },
          formatter: (v: number) => (isR ? `${v.toFixed(1)}R` : fmtMoney(v)),
        },
      },
      markers: { size: 0, hover: { size: 4 }, colors: ['#5b8def'], strokeColors: '#0f1216', strokeWidth: 2 },
      annotations: {
        yaxis: [{ y: 0, borderColor: '#2a2f37', strokeDashArray: 3 }],
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'dd MMM yyyy' },
        custom: ({ dataPointIndex }: any) => {
          const p = points[dataPointIndex];
          if (!p) return '';
          const val = isR ? p.r : p.equity;
          const dd = isR ? p.ddR : p.ddD;
          const valStr = isR
            ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`
            : `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
          const ddStr = isR ? `${dd.toFixed(2)}R` : `-$${Math.abs(dd).toFixed(2)}`;
          const date = new Date(p.ts).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          });
          return (
            `<div style="background:#0f1216;border:1px solid #2a2f37;border-radius:8px;padding:8px 10px;font-family:Inter,sans-serif">` +
            `<div style="color:#6b7280;font-size:10px;margin-bottom:3px">${date}</div>` +
            `<div style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:14px;color:${val >= 0 ? '#4cc38a' : '#e5635f'}">${valStr}</div>` +
            (dd < 0 ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#e5635f;margin-top:2px">drawdown ${ddStr}</div>` : '') +
            `</div>`
          );
        },
      },
    }),
    [points, isR],
  );

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-jtp-md font-semibold text-jtp-text">Equity Curve</h3>
        <div className="flex bg-jtp-control border border-jtp-borderStrong rounded-jtp-md overflow-hidden text-jtp-xs">
          <button onClick={() => setIsR(false)} className={`px-2.5 py-1 ${!isR ? 'bg-jtp-blue text-white' : 'text-jtp-textDim'}`}>$</button>
          <button onClick={() => setIsR(true)} className={`px-2.5 py-1 ${isR ? 'bg-jtp-blue text-white' : 'text-jtp-textDim'}`}>R</button>
        </div>
      </div>
      {points.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-jtp-textDim text-jtp-sm">No closed trades yet</div>
      ) : (
        <Chart options={options as any} series={series} type="area" height={260} />
      )}
    </div>
  );
};

export default DashEquityCurve;
