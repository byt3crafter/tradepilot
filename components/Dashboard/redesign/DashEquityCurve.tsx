import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Trade, BrokerAccount } from '../../../types';

interface Props {
  closedTrades: Trade[];
  account?: BrokerAccount | null;
}

const netOf = (t: Trade) => (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);

interface Pt { time: number; eq: number; r: number; ddD: number; ddR: number; }

const DashEquityCurve: React.FC<Props> = ({ closedTrades }) => {
  const [isR, setIsR] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const isRRef = useRef(isR);
  isRRef.current = isR;

  const points = useMemo<Pt[]>(() => {
    const sorted = [...closedTrades].sort(
      (a, b) =>
        new Date(a.exitDate ?? a.entryDate).getTime() -
        new Date(b.exitDate ?? b.entryDate).getTime(),
    );
    let eq = 0, r = 0, peak = 0, peakR = 0, last = 0;
    return sorted.map((t) => {
      eq += netOf(t);
      r += t.realisedR ?? 0;
      peak = Math.max(peak, eq);
      peakR = Math.max(peakR, r);
      let time = Math.floor(new Date(t.exitDate ?? t.entryDate).getTime() / 1000);
      if (time <= last) time = last + 1; // keep strictly ascending for the time scale
      last = time;
      return { time, eq, r, ddD: eq - peak, ddR: r - peakR };
    });
  }, [closedTrades]);

  const ddByTime = useMemo(() => {
    const m = new Map<number, Pt>();
    points.forEach((p) => m.set(p.time, p));
    return m;
  }, [points]);

  // create chart once
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        attributionLogo: false, // remove the TradingView logo (we satisfy attribution)
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(28,33,40,0.6)' },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: 'rgba(91,141,239,0.5)', width: 1, style: LineStyle.Dashed, labelVisible: false },
        horzLine: { color: 'rgba(91,141,239,0.5)', labelBackgroundColor: '#5b8def' },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,            // no trailing empty space after the last point
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale: false,
    });
    const series = (chart as any).addAreaSeries({
      lineColor: '#5b8def',
      lineWidth: 2,
      topColor: 'rgba(91,141,239,0.28)',
      bottomColor: 'rgba(91,141,239,0)',
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#5b8def',
      crosshairMarkerBackgroundColor: '#5b8def',
    });
    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      const tip = tipRef.current;
      if (!tip) return;
      if (!param.time || !param.point) { tip.style.display = 'none'; return; }
      const p = ddByTimeRef.current.get(param.time as number);
      if (!p) { tip.style.display = 'none'; return; }
      const r = isRRef.current;
      const val = r ? p.r : p.eq;
      const dd = r ? p.ddR : p.ddD;
      const valStr = r
        ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`
        : `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
      const ddStr = r ? `${dd.toFixed(2)}R` : `-$${Math.abs(dd).toFixed(2)}`;
      const date = new Date(p.time * 1000).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      tip.innerHTML =
        `<div style="color:#6b7280;font-size:10px;margin-bottom:2px">${date}</div>` +
        `<div style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${val >= 0 ? '#4cc38a' : '#e5635f'}">${valStr}</div>` +
        (dd < 0 ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#e5635f;margin-top:2px">drawdown ${ddStr}</div>` : '');
      tip.style.display = 'block';
      const x = Math.min(Math.max(param.point.x + 14, 8), el.clientWidth - 140);
      tip.style.left = `${x}px`;
      tip.style.top = `8px`;
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // keep a ref to the dd map for the crosshair callback
  const ddByTimeRef = useRef(ddByTime);
  ddByTimeRef.current = ddByTime;

  // set / update data on toggle or data change
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    s.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: isR ? p.r : p.eq })));
    s.applyOptions({
      priceFormat: isR
        ? { type: 'custom', formatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}R`, minMove: 0.1 }
        : { type: 'custom', formatter: (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`), minMove: 1 },
    });
    chartRef.current?.timeScale().fitContent();
  }, [points, isR]);

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
        <div className="relative w-full h-[260px]">
          <div ref={wrapRef} className="absolute inset-0" />
          <div
            ref={tipRef}
            className="pointer-events-none absolute z-10 bg-jtp-panel border border-jtp-borderStrong rounded-jtp-md px-2.5 py-1.5 shadow-jtp-drawer"
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
};

export default DashEquityCurve;
