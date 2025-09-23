import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Playbook, PlaybookSetup } from '../../types';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Textarea from '../ui/Textarea';
import { usePlaybook } from '../../context/PlaybookContext';
import { PlusIcon } from '../icons/PlusIcon';
import ChecklistInput from './ChecklistInput';
import ImageUploader from '../trades/ImageUploader';
import ToggleSwitch from '../ui/ToggleSwitch';

interface PlaybookBuilderModalProps {
  playbookToEdit: Playbook | null;
  onClose: () => void;
}

const PlaybookBuilderModal: React.FC<PlaybookBuilderModalProps> = ({ playbookToEdit, onClose }) => {
  const { createPlaybook, updatePlaybook } = usePlaybook();
  const isEditMode = !!playbookToEdit;
  
  const [playbook, setPlaybook] = useState<Partial<Playbook>>(
    playbookToEdit || {
      name: '',
      coreIdea: '',
      isPublic: false,
      tradingStyles: [],
      instruments: [],
      timeframes: [],
      pros: [],
      cons: [],
      setups: [],
    }
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPlaybook(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (field: keyof Playbook, value: string) => {
    setPlaybook(prev => ({ ...prev, [field]: value.split(',').map(item => item.trim()).filter(Boolean) }));
  };

  const handleAddSetup = () => {
    const newSetup: PlaybookSetup = {
      id: `new-${Date.now()}`,
      name: 'New Setup',
      entryCriteria: [],
      riskManagement: [],
    };
    setPlaybook(prev => ({
      ...prev,
      setups: [...(prev.setups || []), newSetup],
    }));
  };

  const handleSetupChange = (index: number, field: keyof PlaybookSetup, value: any) => {
    setPlaybook(prev => {
      const newSetups = [...(prev.setups || [])];
      newSetups[index] = { ...newSetups[index], [field]: value };
      return { ...prev, setups: newSetups };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Create a sanitized payload to send to the backend, removing any read-only fields
    // like 'id', 'userId', etc., which cause validation errors.
    const sanitizedPayload = {
      name: playbook.name,
      coreIdea: playbook.coreIdea,
      isPublic: playbook.isPublic,
      tradingStyles: playbook.tradingStyles,
      instruments: playbook.instruments,
      timeframes: playbook.timeframes,
      pros: playbook.pros,
      cons: playbook.cons,
      setups: playbook.setups?.map(setup => ({
        name: setup.name,
        screenshotBeforeUrl: setup.screenshotBeforeUrl,
        screenshotAfterUrl: setup.screenshotAfterUrl,
        entryCriteria: setup.entryCriteria.map(item => ({ text: item.text })),
        riskManagement: setup.riskManagement.map(item => ({ text: item.text })),
      })),
    };

    try {
      if (isEditMode) {
        // FIX: Cast sanitizedPayload to 'any' to resolve type mismatch. The payload is
        // intentionally shaped to match the backend DTO for an update operation, which
        // does not expect IDs for nested entities.
        await updatePlaybook(playbookToEdit.id, sanitizedPayload as any);
      } else {
        // FIX: Cast sanitizedPayload to 'any' to resolve type mismatch. The payload is
        // intentionally shaped to match the backend DTO for a create operation, which
        // does not expect IDs for nested entities.
        await createPlaybook(sanitizedPayload as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Modal title={isEditMode ? 'Edit Playbook' : 'Create New Playbook'} onClose={onClose} size="4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- CORE DETAILS --- */}
        <section>
          <h3 className="text-lg font-orbitron text-photonic-blue mb-3">Core Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuthInput label="Playbook Name" id="name" name="name" value={playbook.name} onChange={handleInputChange} required />
            <AuthInput label="Core Idea" id="coreIdea" name="coreIdea" value={playbook.coreIdea || ''} onChange={handleInputChange} placeholder="e.g., Trend continuation on pullbacks" />
          </div>
          <div className="mt-4">
             <ToggleSwitch label="Make this playbook public" checked={!!playbook.isPublic} onChange={val => setPlaybook(p => ({...p, isPublic: val}))} />
          </div>
        </section>

        {/* --- TAGS --- */}
        <section>
            <h3 className="text-lg font-orbitron text-photonic-blue mb-3">Tags</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AuthInput label="Trading Styles" id="tradingStyles" name="tradingStyles" placeholder="Swing, Day, Scalp" value={playbook.tradingStyles?.join(', ')} onChange={e => handleArrayChange('tradingStyles', e.target.value)} />
                <AuthInput label="Instruments" id="instruments" name="instruments" placeholder="Forex, Crypto, Futures" value={playbook.instruments?.join(', ')} onChange={e => handleArrayChange('instruments', e.target.value)} />
                <AuthInput label="Timeframes" id="timeframes" name="timeframes" placeholder="4-Hour, 1-Hour" value={playbook.timeframes?.join(', ')} onChange={e => handleArrayChange('timeframes', e.target.value)} />
            </div>
        </section>

        {/* --- PROS & CONS --- */}
        <section>
            <h3 className="text-lg font-orbitron text-photonic-blue mb-3">Pros & Cons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea label="Pros" id="pros" name="pros" placeholder="One per line..." value={playbook.pros?.join('\n')} onChange={e => setPlaybook(p => ({...p, pros: e.target.value.split('\n')}))} />
                <Textarea label="Cons" id="cons" name="cons" placeholder="One per line..." value={playbook.cons?.join('\n')} onChange={e => setPlaybook(p => ({...p, cons: e.target.value.split('\n')}))} />
            </div>
        </section>

        {/* --- SETUPS --- */}
        <section>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-orbitron text-photonic-blue">Setups</h3>
                <Button type="button" onClick={handleAddSetup} className="w-auto flex items-center gap-2 text-sm px-3 py-1.5">
                    <PlusIcon className="w-4 h-4" /> Add Setup
                </Button>
            </div>
            <div className="space-y-4">
                {playbook.setups?.map((setup, index) => (
                    <div key={setup.id} className="p-4 bg-future-dark/50 rounded-lg border border-photonic-blue/10">
                        <AuthInput label="Setup Name" id={`setup-name-${index}`} value={setup.name} onChange={e => handleSetupChange(index, 'name', e.target.value)} />
                        
                        <div className="grid grid-cols-2 gap-4 my-4">
                             <ImageUploader label="'Before' Chart" onImageUpload={base64 => handleSetupChange(index, 'screenshotBeforeUrl', base64)} currentImage={setup.screenshotBeforeUrl} />
                            <ImageUploader label="'After' Chart" onImageUpload={base64 => handleSetupChange(index, 'screenshotAfterUrl', base64)} currentImage={setup.screenshotAfterUrl} />
                        </div>

                        <ChecklistInput title="Entry Criteria" items={setup.entryCriteria} onChange={items => handleSetupChange(index, 'entryCriteria', items)} />
                        <ChecklistInput title="Risk Management" items={setup.riskManagement} onChange={items => handleSetupChange(index, 'riskManagement', items)} />
                    </div>
                ))}
            </div>
        </section>

        {/* --- FOOTER --- */}
        <div className="mt-6 pt-6 border-t border-photonic-blue/10">
          {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Spinner /> : (isEditMode ? 'Save Playbook' : 'Create Playbook')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PlaybookBuilderModal;