import React from 'react';
import { Trade, Direction } from '../../types';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';
import { useTrade } from '../../context/TradeContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { ActivateIcon } from '../icons/ActivateIcon';
import { CancelIcon } from '../icons/CancelIcon';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { PencilIcon } from '../icons/PencilIcon';
import { usePriceFormatter } from '../../hooks/usePriceFormatter';

interface PendingOrderRowProps {
  trade: Trade;
  onEdit: () => void;
}

const DirectionIndicator: React.FC<{ direction: Direction }> = ({ direction }) => {
    const isBuy = direction === Direction.Buy;
    const colorClass = isBuy ? 'text-momentum-green' : 'text-risk-high';
    const Icon = isBuy ? ArrowUpIcon : ArrowDownIcon;

    return (
        <div className={`flex items-center gap-2 ${colorClass}`}>
            <Icon className="w-3 h-3" />
            <span>{direction}</span>
        </div>
    );
};

const PendingOrderRow: React.FC<PendingOrderRowProps> = ({ trade, onEdit }) => {
  const { deleteTrade, activatePendingOrder } = useTrade();
  const { playbooks } = usePlaybook();
  const { formatPrice } = usePriceFormatter(trade.asset);
  
  const playbookName = playbooks.find(s => s.id === trade.playbookId)?.name || 'Unknown';

  const handleActivate = async () => {
    if (window.confirm('Activate this pending order? This will move it to your Live Trades.')) {
      await activatePendingOrder(trade.id);
    }
  };
  
  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel and delete this pending order?')) {
      await deleteTrade(trade.id);
    }
  };

  return (
    <tr className="border-b border-future-panel/50 hover:bg-photonic-blue/5 transition-colors duration-200">
      <td></td>
      <td className="p-3 font-tech-mono text-future-gray">{new Date(trade.createdAt).toLocaleDateString()}</td>
      <td className="p-3 font-tech-mono font-semibold text-future-light">{trade.asset}</td>
      <td className="p-3 font-tech-mono"><DirectionIndicator direction={trade.direction} /></td>
      <td className="p-3 font-tech-mono text-future-light">{formatPrice(trade.entryPrice)}</td>
      <td className="p-3 font-tech-mono text-future-gray">{trade.riskPercentage.toFixed(2)}%</td>
      <td className="p-3 text-future-light">{playbookName}</td>
      <td className="p-3">
        <div className="flex gap-2">
            <button onClick={handleActivate} className="flex items-center gap-1 text-sm text-momentum-green hover:underline">
                <ActivateIcon className="w-4 h-4" />
                Activate
            </button>
            <button onClick={handleCancel} className="flex items-center gap-1 text-sm text-risk-high hover:underline">
                <CancelIcon className="w-4 h-4" />
                Cancel
            </button>
            <DropdownMenu>
              <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit
              </DropdownMenuItem>
            </DropdownMenu>
        </div>
      </td>
    </tr>
  );
};

export default PendingOrderRow;