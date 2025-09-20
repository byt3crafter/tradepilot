import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useChecklist } from '../../context/ChecklistContext';
import Checkbox from '../ui/Checkbox';
import Spinner from '../Spinner';

interface PreFlightChecklistModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const PreFlightChecklistModal: React.FC<PreFlightChecklistModalProps> = ({ onSuccess, onClose }) => {
  const { rules, isLoading } = useChecklist();
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  const handleCheckboxChange = (ruleId: string) => {
    setCheckedState(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };

  const isComplete = rules.every(rule => checkedState[rule.id]);

  return (
    <Modal title="Pre-Flight Checklist" onClose={onClose} size="lg">
      <div>
        <p className="text-future-gray text-sm mb-4">Confirm you have followed your rules before proceeding.</p>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {rules.map(rule => (
              <Checkbox
                key={rule.id}
                id={`preflight-${rule.id}`}
                label={rule.rule}
                checked={!!checkedState[rule.id]}
                onChange={() => handleCheckboxChange(rule.id)}
              />
            ))}
          </div>
        )}
        <div className="mt-6">
          <Button
            onClick={onSuccess}
            disabled={!isComplete || isLoading}
            className="w-full"
          >
            Checklist Complete: Proceed
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PreFlightChecklistModal;
