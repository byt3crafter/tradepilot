import React from 'react';
import Drawer from '../ui/Drawer';
import { CommunityPlaybook } from '../../types';

interface CommunityPlaybookDetailModalProps {
  playbook: CommunityPlaybook;
  onClose: () => void;
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-photonic-blue/10 text-photonic-blue text-xs font-semibold px-2.5 py-1 rounded-full">
    {children}
  </span>
);

const ChecklistDisplay: React.FC<{ title: string, items: { text: string }[] }> = ({ title, items }) => (
  <div>
    <h4 className="font-semibold text-future-light mb-2">{title}</h4>
    <ul className="list-disc list-inside space-y-1 text-sm text-future-gray">
      {items.map((item, index) => <li key={index}>{item.text}</li>)}
    </ul>
  </div>
);

const CommunityPlaybookDetailModal: React.FC<CommunityPlaybookDetailModalProps> = ({ playbook, onClose }) => {
  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={playbook.name}
      subtitle={`by ${playbook.authorName}`}
      width="lg"
    >
      <div className="space-y-6">
        {/* --- HEADER --- */}
        <section>
          <p className="text-jtp-textMuted italic text-jtp-sm">{playbook.coreIdea}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {playbook.tradingStyles.map(tag => <Tag key={tag}>{tag}</Tag>)}
            {playbook.instruments.map(tag => <Tag key={tag}>{tag}</Tag>)}
            {playbook.timeframes.map(tag => <Tag key={tag}>{tag}</Tag>)}
          </div>
        </section>

        {/* --- PROS & CONS --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-jtp-border">
          <div>
            <h3 className="text-jtp-sm font-semibold text-jtp-profit mb-2">Pros</h3>
            <ul className="list-disc list-inside space-y-1 text-jtp-sm text-jtp-textSoft">
              {playbook.pros.map((pro, i) => <li key={i}>{pro}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-jtp-sm font-semibold text-jtp-loss mb-2">Cons to Manage</h3>
            <ul className="list-disc list-inside space-y-1 text-jtp-sm text-jtp-textSoft">
              {playbook.cons.map((con, i) => <li key={i}>{con}</li>)}
            </ul>
          </div>
        </section>

        {/* --- SETUPS --- */}
        <section>
          <h2 className="text-jtp-base font-semibold text-jtp-text mb-4 border-t border-jtp-border pt-4">Setups</h2>
          <div className="space-y-6">
            {playbook.setups.map(setup => (
              <div key={setup.id} className="p-4 bg-jtp-raised rounded-jtp-panel border border-jtp-border">
                <h3 className="text-jtp-base font-semibold text-jtp-textSoft mb-4">{setup.name}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <ChecklistDisplay title="Entry Criteria" items={setup.entryCriteria} />
                    <ChecklistDisplay title="Risk Management" items={setup.riskManagement} />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-jtp-xs text-jtp-textDim">Ideal 'Before' Chart</span>
                      {setup.screenshotBeforeUrl
                        ? <img src={setup.screenshotBeforeUrl} alt="Before" className="mt-1 rounded-jtp-md border border-jtp-border" />
                        : <div className="mt-1 h-24 bg-jtp-shell/30 rounded-jtp-md flex items-center justify-center text-jtp-xs text-jtp-textFaint">Not provided</div>}
                    </div>
                    <div>
                      <span className="text-jtp-xs text-jtp-textDim">Ideal 'After' Chart</span>
                      {setup.screenshotAfterUrl
                        ? <img src={setup.screenshotAfterUrl} alt="After" className="mt-1 rounded-jtp-md border border-jtp-border" />
                        : <div className="mt-1 h-24 bg-jtp-shell/30 rounded-jtp-md flex items-center justify-center text-jtp-xs text-jtp-textFaint">Not provided</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  );
};

export default CommunityPlaybookDetailModal;