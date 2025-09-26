import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { PreTradeCheckResult } from '../../types';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { QuestionMarkCircleIcon } from '../icons/QuestionMarkCircleIcon';

interface SanityCheckModalProps {
  result: PreTradeCheckResult;
  onClose: () => void;
  onConfirm: () => void;
}

const SanityCheckModal: React.FC<SanityCheckModalProps> = ({ result, onClose, onConfirm }) => {
    const allMet = result.every(item => item.met === 'Yes');

    const Icon = ({ met }: { met: 'Yes' | 'No' | 'Indeterminate' }) => {
        if (met === 'Yes') return <CheckCircleIcon className="w-5 h-5 text-momentum-green flex-shrink-0" />;
        if (met === 'No') return <XCircleIcon className="w-5 h-5 text-risk-high flex-shrink-0" />;
        return <QuestionMarkCircleIcon className="w-5 h-5 text-future-gray flex-shrink-0" />;
    };

    return (
        <Modal title="AI Sanity Check Results" onClose={onClose} size="lg">
            <div>
                <div className="mb-4 p-3 rounded-md bg-future-dark/50">
                    <p className={`text-center font-semibold ${allMet ? 'text-momentum-green' : 'text-risk-medium'}`}>
                        {allMet ? "All checks passed!" : "Some criteria may not be met. Please review carefully."}
                    </p>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 sidebar-scrollbar">
                    {result.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 border-b border-future-panel">
                            <Icon met={item.met} />
                            <div className="flex-1">
                                <p className="font-semibold text-future-light text-sm">{item.rule}</p>
                                <p className="text-xs text-future-gray mt-1">{item.reasoning}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6">
                    <Button
                        onClick={onConfirm}
                        className="w-full"
                    >
                        Acknowledge & Continue
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SanityCheckModal;
