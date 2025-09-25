import React from 'react';
import Card from '../Card';
import Button from '../ui/Button';
import { XCircleIcon } from '../icons/XCircleIcon';

interface OnboardingCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaText: string;
  ctaAction: () => void;
  onDismiss: (id: string) => void;
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({ id, icon, title, description, ctaText, ctaAction, onDismiss }) => {
  return (
    <Card className="flex flex-col h-full relative group">
       <button 
        onClick={() => onDismiss(id)}
        className="absolute top-2 right-2 p-1 text-future-gray rounded-full opacity-0 group-hover:opacity-100 hover:bg-future-dark hover:text-future-light transition-all"
        aria-label={`Dismiss "${title}"`}
      >
        <XCircleIcon className="w-5 h-5" />
      </button>

      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-photonic-blue/10 text-photonic-blue rounded-lg mb-3">
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold text-future-light mb-2">{title}</h3>
        <p className="text-sm text-future-gray">{description}</p>
      </div>
      <div className="mt-4">
        <Button onClick={ctaAction} className="w-full text-sm py-2">
          {ctaText}
        </Button>
      </div>
    </Card>
  );
};

export default OnboardingCard;