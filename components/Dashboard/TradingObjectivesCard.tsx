import React from 'react';
import { ObjectiveProgress } from '../../types';
import ObjectiveItem from './ObjectiveItem';
import Card from '../Card';

interface TradingObjectivesCardProps {
  objectives: ObjectiveProgress[];
  currentEquity?: number;
}

const TradingObjectivesCard: React.FC<TradingObjectivesCardProps> = ({ objectives, currentEquity }) => {
  if (!objectives || objectives.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Equity Card */}
      {currentEquity !== undefined && (
        <Card className="p-3 flex flex-col h-full border-white/10">
          <div className="flex justify-between items-start">
            <h4 className="text-xs text-future-gray uppercase tracking-wider font-semibold">Equity</h4>
            <div className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-white/5 text-white border-white/10">
              Live
            </div>
          </div>
          <div className="flex-grow flex flex-col justify-center items-start">
            <div className="text-xl font-orbitron text-future-light">
              ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </Card>
      )}

      {objectives.map((obj) => (
        <ObjectiveItem key={obj.key} objective={obj} />
      ))}
    </div>
  );
};

export default TradingObjectivesCard;
