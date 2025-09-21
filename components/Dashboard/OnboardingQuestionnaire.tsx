import React, { useState } from 'react';
import Card from '../Card';
import Button from '../ui/Button';
import SelectInput from '../ui/SelectInput';
import SelectableCard from '../ui/SelectableCard';

interface OnboardingQuestionnaireProps {
  onComplete: () => void;
}

const experienceLevels = [
  { value: '<1', label: '< 1 year', description: 'Newbie' },
  { value: '1-3', label: '1-3 years', description: 'Climbing Ranks' },
  { value: '3-5', label: '3-5 years', description: 'Ninja Level' },
  { value: '5+', label: '5+ years', description: 'Monk Mode' },
];

const instruments = ['Stocks', 'Options', 'Forex', 'Crypto', 'Futures', 'Other'];

const brokers = [
    { value: '', label: 'Select a broker...' },
    { value: 'ic_markets', label: 'IC Markets' },
    { value: 'pepperstone', label: 'Pepperstone' },
    { value: 'ftmo', label: 'FTMO' },
    { value: 'interactive_brokers', label: 'Interactive Brokers' },
    { value: 'thinkorswim', label: 'Thinkorswim' },
    { value: 'other', label: 'Other' },
];

const OnboardingQuestionnaire: React.FC<OnboardingQuestionnaireProps> = ({ onComplete }) => {
  const [experience, setExperience] = useState('');
  const [broker, setBroker] = useState('');
  const [tradedInstruments, setTradedInstruments] = useState<string[]>([]);

  const handleInstrumentToggle = (instrument: string) => {
    setTradedInstruments(prev => 
      prev.includes(instrument) 
        ? prev.filter(i => i !== instrument) 
        : [...prev, instrument]
    );
  };

  const canSubmit = experience && broker && tradedInstruments.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    // Here you would typically save this data to your backend
    console.log('Onboarding data:', { experience, broker, tradedInstruments });
    onComplete();
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="text-center mb-8">
            <h2 className="text-2xl font-orbitron text-photonic-blue">Welcome to tradePilot</h2>
            <p className="text-future-gray mt-2">Let's personalize your experience. Tell us a bit about your trading journey.</p>
        </div>
        
        <div className="space-y-8">
          {/* Experience Level */}
          <div>
            <label className="block text-lg font-semibold text-future-light mb-3">How long have you been trading?</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {experienceLevels.map(level => (
                <SelectableCard
                  key={level.value}
                  label={level.label}
                  description={level.description}
                  isSelected={experience === level.value}
                  onSelect={() => setExperience(level.value)}
                  type="radio"
                />
              ))}
            </div>
          </div>

          {/* Broker Selection */}
          <div>
             <SelectInput
              label="Who is your primary broker?"
              subLabel="Select only one"
              id="broker"
              name="broker"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              options={brokers}
            />
          </div>

          {/* Instruments */}
          <div>
            <label className="block text-lg font-semibold text-future-light mb-3">What are you currently trading?</label>
             <p className="text-sm text-future-gray -mt-2 mb-3">Select all that apply</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {instruments.map(instrument => (
                <SelectableCard
                  key={instrument}
                  label={instrument}
                  isSelected={tradedInstruments.includes(instrument)}
                  onSelect={() => handleInstrumentToggle(instrument)}
                  type="checkbox"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-photonic-blue/10">
          <Button type="submit" className="w-full md:w-auto md:float-right" disabled={!canSubmit}>
            Save & Continue
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default OnboardingQuestionnaire;
