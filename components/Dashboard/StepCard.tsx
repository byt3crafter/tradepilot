import React from 'react';
import Card from '../Card';
import Button from '../ui/Button';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  ctaText: string;
  ctaAction: () => void;
  isComplete: boolean;
  isLocked?: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ stepNumber, title, description, ctaText, ctaAction, isComplete, isLocked = false }) => {
  return (
    <Card className={`flex flex-col h-full transition-all duration-300 ${isComplete ? 'border-momentum-green/30 bg-momentum-green/5' : ''} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-orbitron text-photonic-blue/80">Step {stepNumber}</span>
        {isComplete && <CheckCircleIcon className="w-6 h-6 text-momentum-green" />}
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold text-future-light mb-2">{title}</h3>
        <p className="text-sm text-future-gray">{description}</p>
      </div>
      <div className="mt-4">
        <Button 
          onClick={ctaAction} 
          className="w-full text-sm py-2" 
          disabled={isComplete || isLocked}
        >
          {isComplete ? 'Completed' : ctaText}
        </Button>
      </div>
    </Card>
  );
};

export default StepCard;
