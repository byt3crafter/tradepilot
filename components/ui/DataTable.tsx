/**
 * DataTable — dense, monospace, console-grade data table.
 *
 * Features:
 *   - Sticky header with uppercase mono column labels
 *   - Zebra striping on alternate rows (very subtle, dark-mode safe)
 *   - Hover highlight on rows
 *   - Right-aligned numeric columns (pass align: 'right', mono: true)
 *   - Custom cell rendering via column.render(value, row)
 *   - Empty state with configurable message
 *
 * Usage:
 *   const cols: TableColumn<Trade>[] = [
 *     { key: 'asset', header: 'ASSET' },
 *     { key: 'direction', header: 'DIR', width: '60px' },
 *     { key: 'profitLoss', header: 'P&L', align: 'right', mono: true,
 *       render: (v) => <span className={v >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}>...</span> },
 *   ];
 *   <DataTable columns={cols} data={trades} keyFn={(t) => t.id} />
 *
 * Wrap in a Panel with noPadding for the canonical usage:
 *   <Panel label="TRADE LOG" noPadding>
 *     <DataTable columns={...} data={...} keyFn={...} maxHeight="400px" />
 *   </Panel>
 */
import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  /** Text alignment for header and cells. Numerics should be 'right'. */
  align?: 'left' | 'right' | 'center';
  /** When true, renders cell text in JetBrains Mono with tabular-nums */
  mono?: boolean;
  /** Custom cell renderer */
  render?: (value: any, row: T) => React.ReactNode;
  /** Optional fixed column width */
  width?: string;
  /** Additional className for td elements */
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  /** Key extractor for React reconciliation */
  keyFn: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  /** Max height for the table container — enables vertical scroll */
  maxHeight?: string;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyFn,
  emptyMessage = 'No data to display',
  className = '',
  maxHeight,
  onRowClick,
}: DataTableProps<T>) {
  const alignClass = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div
      className={`overflow-x-auto ${className}`}
      style={{
        ...(maxHeight ? { maxHeight, overflowY: 'auto' } : {}),
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
      }}
    >
      <table className="w-full min-w-[520px] border-collapse" style={{ fontSize: '13px' }}>
        {/* Sticky header */}
        <thead className="sticky top-0 z-10 bg-jtp-raised">
          <tr style={{ borderBottom: '1px solid rgba(232,162,61,0.3)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-[7px] jtp-label whitespace-nowrap font-medium font-mono tracking-[0.1em] ${alignClass(col.align)}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-jtp-textFaint"
                style={{ fontSize: '13px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={keyFn(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'border-b border-jtp-borderSubtle transition-colors',
                  i % 2 === 1 ? 'bg-[rgba(255,255,255,0.013)]' : '',
                  onRowClick
                    ? 'cursor-pointer hover:bg-jtp-hover'
                    : 'hover:bg-jtp-hover cursor-default',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {columns.map((col) => {
                  const rawValue = row[col.key];
                  return (
                    <td
                      key={col.key}
                      className={[
                        // All table cells are mono — trading data is always data, not prose.
                        // col.mono adds tabular-nums alignment for numeric/money columns.
                        'px-3 py-[9px] text-jtp-text font-mono',
                        alignClass(col.align),
                        col.cellClassName ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        col.mono
                          ? { fontVariantNumeric: 'tabular-nums' }
                          : undefined
                      }
                    >
                      {col.render ? col.render(rawValue, row) : rawValue}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
