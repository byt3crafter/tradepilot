import React, { useState } from 'react';
import { Panel, Button, SelectInput } from '../ui';

interface OnboardingQuestionnaireProps {
  onComplete: () => void;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const experienceLevels = [
  { value: '<1',  label: '< 1 yr',  description: 'Newbie' },
  { value: '1-3', label: '1–3 yrs', description: 'Building edge' },
  { value: '3-5', label: '3–5 yrs', description: 'Experienced' },
  { value: '5+',  label: '5+ yrs',  description: 'Veteran' },
];

const instruments = ['Stocks', 'Options', 'Forex', 'Crypto', 'Futures', 'Other'];

const brokers = [
  { value: '',                   label: 'Select a broker...' },
  { value: 'ic_markets',         label: 'IC Markets' },
  { value: 'pepperstone',        label: 'Pepperstone' },
  { value: 'ftmo',               label: 'FTMO' },
  { value: 'interactive_brokers', label: 'Interactive Brokers' },
  { value: 'thinkorswim',        label: 'Thinkorswim' },
  { value: 'other',              label: 'Other' },
];

// ── Inline selectable tile (terminal style, scoped to this form) ──────────────

interface TileProps {
  label: string;
  description?: string;
  isSelected: boolean;
  onSelect: () => void;
  type: 'radio' | 'checkbox';
}

const SelectableTile: React.FC<TileProps> = ({
  label,
  description,
  isSelected,
  onSelect,
  type,
}) => (
  <div
    onClick={onSelect}
    role={type}
    aria-checked={isSelected}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === ' ' || e.key === 'Enter') onSelect();
    }}
    className="p-3 rounded-[2px] cursor-pointer transition-all duration-150 text-center flex flex-col justify-center min-h-[56px] select-none"
    style={{
      backgroundColor: isSelected ? 'rgba(232,162,61,0.08)' : '#131619',
      border:          `1px solid ${isSelected ? '#e8a23d' : '#1b2026'}`,
      boxShadow:       isSelected ? 'inset 0 0 0 1px rgba(232,162,61,0.25)' : 'none',
    }}
  >
    <span
      className="font-mono text-jtp-sm font-semibold"
      style={{ color: isSelected ? '#e8a23d' : '#ccd1d8' }}
    >
      {label}
    </span>
    {description && (
      <span className="text-jtp-xs text-jtp-textDim mt-[3px]">
        {description}
      </span>
    )}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const OnboardingQuestionnaire: React.FC<OnboardingQuestionnaireProps> = ({ onComplete }) => {
  const [experience,        setExperience]        = useState('');
  const [broker,            setBroker]            = useState('');
  const [tradedInstruments, setTradedInstruments] = useState<string[]>([]);

  const handleInstrumentToggle = (instrument: string) => {
    setTradedInstruments(prev =>
      prev.includes(instrument)
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument],
    );
  };

  const canSubmit = experience && broker && tradedInstruments.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    console.log('Onboarding data:', { experience, broker, tradedInstruments });
    onComplete();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Panel label="TERMINAL SETUP">
        <form onSubmit={handleSubmit}>

          {/* Intro copy */}
          <p className="text-jtp-md text-jtp-textMuted mb-8 leading-relaxed">
            Let us personalise your terminal. Tell us about your trading background
            so we can configure the right defaults.
          </p>

          <div className="flex flex-col gap-8">

            {/* ── Experience level ── */}
            <fieldset>
              <legend className="jtp-label mb-3 block" style={{ letterSpacing: '0.08em' }}>
                <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>
                HOW LONG HAVE YOU BEEN TRADING?
              </legend>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {experienceLevels.map(level => (
                  <SelectableTile
                    key={level.value}
                    label={level.label}
                    description={level.description}
                    isSelected={experience === level.value}
                    onSelect={() => setExperience(level.value)}
                    type="radio"
                  />
                ))}
              </div>
            </fieldset>

            {/* ── Primary broker ── */}
            <div>
              <SelectInput
                label="PRIMARY BROKER"
                subLabel="Select one"
                id="broker"
                name="broker"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                options={brokers}
                containerClassName=""
              />
            </div>

            {/* ── Instruments ── */}
            <fieldset>
              <legend className="jtp-label mb-1 block" style={{ letterSpacing: '0.08em' }}>
                <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>
                WHAT ARE YOU CURRENTLY TRADING?
              </legend>
              <p className="text-jtp-sm text-jtp-textFaint mb-3">Select all that apply</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {instruments.map(instrument => (
                  <SelectableTile
                    key={instrument}
                    label={instrument}
                    isSelected={tradedInstruments.includes(instrument)}
                    onSelect={() => handleInstrumentToggle(instrument)}
                    type="checkbox"
                  />
                ))}
              </div>
            </fieldset>

          </div>

          {/* ── Submit ── */}
          <div className="mt-10 pt-6 border-t border-jtp-border flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit}
              className="px-8"
            >
              SAVE & CONTINUE
            </Button>
          </div>

        </form>
      </Panel>
    </div>
  );
};

export default OnboardingQuestionnaire;
