import React from 'react';
import { Trade, Direction } from '../../types';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { useTrade } from '../../context/TradeContext';
import Button from '../ui/Button';

interface LiveTradeRowProps {
  trade: Trade;
  onEdit: () => void;
  onClose: () => void;
}

const DirectionIndicator: React.FC<{ direction: Direction }> = ({ direction }) => {
    const isBuy = direction === 'Buy';
    const colorClass = isBuy ? 'text-momentum-green' : 'text-risk-high';
    const Icon = isBuy ? ArrowUpIcon : ArrowDownIcon;

    return (
        <div className={`flex items-center gap-2 ${colorClass}`}>
            <Icon className="w-3 h-3" />
            <span>{direction}</span>
        </div>
    );
};

const LiveTradeRow: React.FC<LiveTradeRowProps> = ({ trade, onEdit, onClose }) => {
  const { deleteTrade } = useTrade();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this live trade entry?')) {
      await deleteTrade(trade.id);
    }
  };

  return (
    <tr className="border-b border-future-panel/50 hover:bg-photonic-blue/5 transition-colors duration-200">
        <td></td>
        <td className="p-3 font-tech-mono text-future-gray">{new Date(trade.entryDate).toLocaleDateString()}</td>
        <td className="p-3 font-tech-mono font-semibold text-future-light">{trade.asset}</td>
        <td className="p-3 font-tech-mono"><DirectionIndicator direction={trade.direction} /></td>
        <td className="p-3 font-tech-mono text-future-light">{trade.entryPrice.toFixed(2)}</td>
        <td className="p-3 font-tech-mono text-future-gray">{trade.riskPercentage.toFixed(2)}%</td>
        <td className="p-3 font-tech-mono text-future-gray text-xs">
           SL: {trade.stopLoss ?? '–'} <br />
           TP: {trade.takeProfit ?? '–'}
        </td>
        <td className="p-3">
            <div className="flex items-center gap-2">
                <Button onClick={onClose} className="text-sm py-1 px-3 w-auto">
                    Close
                </Button>
                <DropdownMenu>
                    <DropdownMenuItem onSelect={onEdit}>
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Edit Entry
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDelete} className="text-risk-high hover:bg-risk-high/10">
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenu>
            </div>
        </td>
    </tr>
  );
};

export default LiveTradeRow;