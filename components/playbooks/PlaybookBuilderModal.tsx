
import React, { useState } from 'react';
import Drawer from '../ui/Drawer';
import { Playbook, PlaybookSetup } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
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
    setPlaybook(prev => ({ ...prev, [field]: value.split(',').map(item => item.trim()) }));
  };

  const handleAddSetup = () => {
    const newSetup: PlaybookSetup = {
      id: `new-${Date.now()}`,
      name: 'New Setup',
      entryCriteria: [],
      riskManagement: [],
      exitRules: [],
      confirmationFilters: [],
      riskSettings: { riskPercent: 1, stopLossType: 'Technical' },
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

  const handleRiskSettingChange = (index: number, setting: string, value: any) => {
    setPlaybook(prev => {
      const newSetups = [...(prev.setups || [])];
      const currentSettings = newSetups[index].riskSettings || {};
      newSetups[index] = {
        ...newSetups[index],
        riskSettings: { ...currentSettings, [setting]: value }
      };
      return { ...prev, setups: newSetups };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const sanitizedPayload = {
      name: playbook.name,
      coreIdea: playbook.coreIdea,
      isPublic: playbook.isPublic,
      tradingStyles: playbook.tradingStyles?.filter(Boolean),
      instruments: playbook.instruments?.filter(Boolean),
      timeframes: playbook.timeframes?.filter(Boolean),
      pros: playbook.pros?.filter(Boolean),
      cons: playbook.cons?.filter(Boolean),
      setups: playbook.setups?.map(setup => ({
        name: setup.name,
        screenshotBeforeUrl: setup.screenshotBeforeUrl,
        screenshotAfterUrl: setup.screenshotAfterUrl,
        entryCriteria: setup.entryCriteria.map(item => ({ text: item.text })),
        riskManagement: setup.riskManagement.map(item => ({ text: item.text })),
        exitRules: setup.exitRules?.map(item => ({ text: item.text })) || [],
        confirmationFilters: setup.confirmationFilters?.map(item => ({ text: item.text })) || [],
        riskSettings: setup.riskSettings,
      })),
    };

    try {
      if (isEditMode) {
        await updatePlaybook(playbookToEdit.id, sanitizedPayload as any);
      } else {
        await createPlaybook(sanitizedPayload as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };


  const footer = (
    <div className="space-y-2">
      {error && <p className="text-jtp-loss text-jtp-lg text-center">{error}</p>}
      <Button type="submit" form="playbook-builder-form" isLoading={isLoading} className="w-full">
        {isEditMode ? 'Save Playbook' : 'Create Playbook'}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEditMode ? 'Edit Playbook' : 'Create New Playbook'}
      subtitle={isEditMode ? 'Update your setup details below' : 'Define your trading edge'}
      width="xl"
      footer={footer}
    >
      <form id="playbook-builder-form" onSubmit={handleSubmit} className="space-y-5">
        {/* ── CORE DETAILS ── */}
        <section className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4 space-y-4">
          <div className="jtp-label">CORE DETAILS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Playbook Name" id="name" name="name" value={playbook.name} onChange={handleInputChange} required />
            <Input label="Core Idea" id="coreIdea" name="coreIdea" value={playbook.coreIdea || ''} onChange={handleInputChange} placeholder="e.g., Trend continuation on pullbacks" />
          </div>
          <ToggleSwitch label="Make this playbook public" checked={!!playbook.isPublic} onChange={val => setPlaybook(p => ({ ...p, isPublic: val }))} />
        </section>

        {/* ── TAGS ── */}
        <section className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4 space-y-4">
          <div className="jtp-label">TAGS</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Trading Styles" id="tradingStyles" name="tradingStyles" placeholder="Swing, Day, Scalp" value={playbook.tradingStyles?.join(', ')} onChange={e => handleArrayChange('tradingStyles', e.target.value)} />
            <Input label="Instruments" id="instruments" name="instruments" placeholder="Forex, Crypto, Futures" value={playbook.instruments?.join(', ')} onChange={e => handleArrayChange('instruments', e.target.value)} />
            <Input label="Timeframes" id="timeframes" name="timeframes" placeholder="4-Hour, 1-Hour" value={playbook.timeframes?.join(', ')} onChange={e => handleArrayChange('timeframes', e.target.value)} />
          </div>
        </section>

        {/* ── PROS & CONS ── */}
        <section className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4 space-y-4">
          <div className="jtp-label">EDGE ANALYSIS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea label="Pros" id="pros" name="pros" placeholder="One per line…" value={playbook.pros?.join('\n')} onChange={e => setPlaybook(p => ({ ...p, pros: e.target.value.split('\n') }))} />
            <Textarea label="Cons" id="cons" name="cons" placeholder="One per line…" value={playbook.cons?.join('\n')} onChange={e => setPlaybook(p => ({ ...p, cons: e.target.value.split('\n') }))} />
          </div>
        </section>

        {/* ── SETUPS ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="jtp-label">SETUPS</div>
            <Button type="button" variant="secondary" onClick={handleAddSetup} className="flex items-center gap-1.5 text-jtp-md px-3 py-1.5">
              <PlusIcon className="w-4 h-4" /> Add Setup
            </Button>
          </div>

          {playbook.setups?.map((setup, index) => (
            <div key={setup.id} className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4 space-y-4">
              <Input label="Setup Name" id={`setup-name-${index}`} value={setup.name} onChange={e => handleSetupChange(index, 'name', e.target.value)} />

              <div className="grid grid-cols-2 gap-4">
                <ImageUploader label="'Before' Chart" onImageUpload={base64 => handleSetupChange(index, 'screenshotBeforeUrl', base64)} currentImage={setup.screenshotBeforeUrl} />
                <ImageUploader label="'After' Chart" onImageUpload={base64 => handleSetupChange(index, 'screenshotAfterUrl', base64)} currentImage={setup.screenshotAfterUrl} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChecklistInput title="Entry Criteria" items={setup.entryCriteria} onChange={items => handleSetupChange(index, 'entryCriteria', items)} />
                <ChecklistInput title="Confirmation Filters" items={setup.confirmationFilters || []} onChange={items => handleSetupChange(index, 'confirmationFilters', items)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChecklistInput title="Exit Rules" items={setup.exitRules || []} onChange={items => handleSetupChange(index, 'exitRules', items)} />
                <ChecklistInput title="Risk Management Rules" items={setup.riskManagement} onChange={items => handleSetupChange(index, 'riskManagement', items)} />
              </div>

              {/* Risk parameters */}
              <div className="p-3 bg-jtp-shell rounded-jtp-md border border-jtp-borderSubtle space-y-3">
                <div className="jtp-label">RISK PARAMETERS</div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Risk % per Trade"
                    type="number"
                    step="0.1"
                    value={setup.riskSettings?.riskPercent || ''}
                    onChange={e => handleRiskSettingChange(index, 'riskPercent', parseFloat(e.target.value))}
                  />
                  <Input
                    label="Stop Loss Type"
                    placeholder="e.g. Technical, Fixed Pips"
                    value={setup.riskSettings?.stopLossType || ''}
                    onChange={e => handleRiskSettingChange(index, 'stopLossType', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {(!playbook.setups || playbook.setups.length === 0) && (
            <div className="border border-dashed border-jtp-borderSubtle rounded-jtp-panel px-4 py-6 text-center text-jtp-md text-jtp-textFaint">
              No setups added yet. Click "Add Setup" to define your first trading pattern.
            </div>
          )}
        </section>
      </form>
    </Drawer>
  );
};

export default PlaybookBuilderModal;
