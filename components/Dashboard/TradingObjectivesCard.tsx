import React from 'react';
import Card from '../Card';
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
    <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-4">Trading Objective</h2>
        <div className="space-y-4">
            {objectives.map(obj => (
                <ObjectiveItem key={obj.key} objective={obj} />
            ))}
        </div>
    </Card>
  );
};

export default TradingObjectivesCard;
