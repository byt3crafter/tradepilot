import React from 'react';
import { AiAnalysis } from '../../types';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';

interface AiAnalysisDisplayProps {
  analysis: AiAnalysis;
}

const AiAnalysisDisplay: React.FC<AiAnalysisDisplayProps> = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-future-gray italic">"{analysis.summary}"</p>
      
      {analysis.goodPoints?.length > 0 && (
        <div>
          {analysis.goodPoints.map((item, index) => (
            <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-momentum-green/5">
              <CheckCircleIcon className="w-5 h-5 text-momentum-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-future-light">{item.point}</p>
                <p className="text-future-gray text-xs">{item.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {analysis.mistakes?.length > 0 && (
        <div>
          {analysis.mistakes.map((item, index) => (
            <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-risk-high/5">
              <XCircleIcon className="w-5 h-5 text-risk-high flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-future-light">{item.mistake}</p>
                <p className="text-future-gray text-xs">{item.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiAnalysisDisplay;