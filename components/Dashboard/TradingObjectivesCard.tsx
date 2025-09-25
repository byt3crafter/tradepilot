import React from 'react';
import { ObjectiveProgress } from '../../types';
import ObjectiveItem from './ObjectiveItem';

interface TradingObjectivesCardProps {
  objectives: ObjectiveProgress[];
}

const TradingObjectivesCard: React.FC<TradingObjectivesCardProps> = ({ objectives }) => {
  if (!objectives || objectives.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {objectives.map((obj) => (
        <ObjectiveItem key={obj.key} objective={obj} />
      ))}
    </div>
  );
};

export default TradingObjectivesCard;
