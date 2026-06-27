import React, { useMemo } from 'react';
import { Trade, TradeResult, Direction } from '../../../types';
import { Panel, DataTable, Badge } from '../../ui';
import type { TableColumn } from '../../ui';

interface DashRecentActivityProps {
  closedTrades: Trade[];
}

// Row shape the DataTable will consume
interface ActivityRow {
  [key: string]: any;
  id: string;
  date: string;
  asset: string;
  dir: string;
  result: string;
  pl: number;
  r: number | null;
  isProfit: boolean;
  isLong: boolean;
}

const DashRecentActivity: React.FC<DashRecentActivityProps> = ({ closedTrades }) => {
  const rows = useMemo<ActivityRow[]>(() => {
    return [...closedTrades]
      .sort((a, b) =>
        new Date(b.exitDate ?? b.entryDate).getTime() -
        new Date(a.exitDate ?? a.entryDate).getTime(),
      )
      .slice(0, 12)
      .map(t => {
        const pl = (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
        return {
          id:      t.id,
          date:    new Date(t.exitDate ?? t.entryDate).toLocaleDateString('en-US', {
            month: 'short',
            day:   'numeric',
          }),
          asset:    t.asset,
          dir:      t.direction === Direction.Buy ? 'LONG' : 'SHORT',
          result:   t.result ?? '',
          pl,
          r:        t.realisedR ?? null,
          isProfit: pl >= 0,
          isLong:   t.direction === Direction.Buy,
        };
      });
  }, [closedTrades]);

  const columns: TableColumn<ActivityRow>[] = [
    {
      key:   'date',
      header: 'DATE',
      width:  '76px',
      mono:   true,
      render: (v) => (
        <span className="text-jtp-textFaint">{v}</span>
      ),
    },
    {
      key:    'asset',
      header: 'ASSET',
    },
    {
      key:    'dir',
      header: 'DIR',
      width:  '72px',
      render: (_v, row) => (
        <span className={row.isLong ? 'text-jtp-profit' : 'text-jtp-loss'}>
          {row.isLong ? '▲' : '▼'} {row.dir}
        </span>
      ),
    },
    {
      key:    'result',
      header: 'RESULT',
      width:  '72px',
      align:  'center',
      render: (v) => {
        const variant =
          v === TradeResult.Win  ? 'profit'  :
          v === TradeResult.Loss ? 'loss'    : 'neutral';
        const label =
          v === TradeResult.Win  ? 'WIN'  :
          v === TradeResult.Loss ? 'LOSS' : 'BE';
        return <Badge variant={variant} size="xs">{label}</Badge>;
      },
    },
    {
      key:    'pl',
      header: 'P&L',
      align:  'right',
      mono:   true,
      render: (v, row) => {
        const abs = Math.abs(v as number);
        const str = `${row.isProfit ? '+' : '-'}$${abs.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
        return (
          <span
            className={`font-semibold ${row.isProfit ? 'text-jtp-profit' : 'text-jtp-loss'}`}
            aria-label={`${row.isProfit ? 'profit' : 'loss'} ${str}`}
          >
            {row.isProfit ? '▲' : '▼'} {str}
          </span>
        );
      },
    },
    {
      key:    'r',
      header: 'R',
      align:  'right',
      mono:   true,
      width:  '68px',
      render: (v) => {
        if (v === null) return <span className="text-jtp-textDim">—</span>;
        const rv  = v as number;
        const str = `${rv >= 0 ? '+' : ''}${rv.toFixed(2)}R`;
        return (
          <span className={rv >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}>
            {str}
          </span>
        );
      },
    },
  ];

  return (
    <Panel label="RECENT ACTIVITY" noPadding className="h-full">
      <DataTable
        columns={columns}
        data={rows}
        keyFn={(row) => row.id}
        emptyMessage="No closed trades yet"
        maxHeight="380px"
      />
    </Panel>
  );
};

export default DashRecentActivity;
