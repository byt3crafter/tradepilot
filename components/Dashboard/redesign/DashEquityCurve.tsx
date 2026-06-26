import React, { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Trade, BrokerAccount } from '../../../types';
import Panel from '../../ui/Panel';
import SegmentedControl from '../../ui/SegmentedControl';

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
  const [mode, setMode] = useState<'$' | 'R'>('$');
  const isR = mode === 'R';

  const points = useMemo<Pt[]>(() => {
    const sorted = [...closedTrades].sort(
      (a, b) =>
        new Date(a.exitDate ?? a.entryDate).getTime() -
        new Date(b.exitDate ?? b.entryDate).getTime(),
    );
    let eq = 0, r = 0, peak = 0, peakR = 0;
    return sorted.map((t) => {
      eq    += netOf(t);
      r     += t.realisedR ?? 0;
      peak   = Math.max(peak, eq);
      peakR  = Math.max(peakR, r);
      return {
        ts:     new Date(t.exitDate ?? t.entryDate).getTime(),
        equity: eq,
        r,
        ddD:    eq - peak,
        ddR:    r  - peakR,
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
        type:             'area' as const,
        background:       'transparent',
        toolbar:          { show: false },
        zoom:             { enabled: false },
        animations:       { enabled: false },
        fontFamily:       '"JetBrains Mono", "IBM Plex Mono", monospace',
        parentHeightOffset: 0,
      },
      theme: { mode: 'dark' as const },
      colors: ['#5b8def'],
      stroke: { curve: 'straight' as const, width: 1.5 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom:    0.35,
          opacityTo:      0,
          stops:          [0, 100],
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor:    'rgba(255,255,255,0.04)',
        strokeDashArray: 0,
        xaxis:          { lines: { show: false } },
        padding:        { left: 8, right: 0, top: 0, bottom: 0 },
      },
      xaxis: {
        type:       'datetime' as const,
        labels:     {
          style:       { colors: '#5b6370', fontSize: '10px', fontFamily: '"JetBrains Mono", monospace' },
          datetimeUTC: true,
        },
        axisBorder:  { show: false },
        axisTicks:   { show: false },
        tooltip:     { enabled: false },
        crosshairs:  { stroke: { color: '#5b8def', dashArray: 4, width: 1 } },
      },
      yaxis: {
        opposite: true,
        labels: {
          style:     { colors: '#5b6370', fontSize: '10px', fontFamily: '"JetBrains Mono", monospace' },
          formatter: (v: number) => (isR ? `${v.toFixed(1)}R` : fmtMoney(v)),
        },
      },
      markers: {
        size:         0,
        hover:        { size: 4 },
        colors:       ['#5b8def'],
        strokeColors: '#0f1216',
        strokeWidth:  2,
      },
      annotations: {
        yaxis: [{ y: 0, borderColor: '#232931', strokeDashArray: 3 }],
      },
      tooltip: {
        theme:  'dark',
        x:      { format: 'dd MMM yyyy' },
        custom: ({ dataPointIndex }: any) => {
          const p = points[dataPointIndex];
          if (!p) return '';
          const val   = isR ? p.r     : p.equity;
          const dd    = isR ? p.ddR   : p.ddD;
          const valStr = isR
            ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`
            : `${val >= 0 ? '' : '-'}$${Math.abs(val).toFixed(0)}`;
          const ddStr = isR ? `${dd.toFixed(2)}R` : `-$${Math.abs(dd).toFixed(0)}`;
          const date  = new Date(p.ts).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          });
          return (
            `<div style="background:#0f1216;border:1px solid #1c2128;border-radius:8px;padding:9px 12px;font-family:'JetBrains Mono',monospace">` +
            `<div style="color:#5b6370;font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px">${date}</div>` +
            `<div style="font-weight:700;font-size:16px;color:${val >= 0 ? '#4cc38a' : '#e5635f'};letter-spacing:-0.5px">${valStr}</div>` +
            (dd < 0 ? `<div style="font-size:10px;color:#e5635f;margin-top:3px">dd ${ddStr}</div>` : '') +
            `</div>`
          );
        },
      },
    }),
    [points, isR],
  );

  const toggle = (
    <SegmentedControl
      segments={[
        { value: '$', label: '$', title: 'Show P&L in dollars' },
        { value: 'R',  label: 'R',  title: 'Show P&L in R-multiples' },
      ]}
      value={mode}
      onChange={(v) => setMode(v as '$' | 'R')}
      size="xs"
    />
  );

  return (
    <Panel label="EQUITY CURVE" actions={toggle} className="h-full">
      {points.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-jtp-textDim text-jtp-md">
          No closed trades yet
        </div>
      ) : (
        <div className="-mx-1">
          <Chart options={options as any} series={series} type="area" height={268} />
        </div>
      )}
    </Panel>
  );
};

export default DashEquityCurve;
