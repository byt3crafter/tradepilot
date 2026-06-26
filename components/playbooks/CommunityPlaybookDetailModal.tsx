import React from 'react';
import Drawer from '../ui/Drawer';
import { CommunityPlaybook } from '../../types';
import { Panel, Badge } from '../ui';

interface CommunityPlaybookDetailModalProps {
  playbook: CommunityPlaybook;
  onClose: () => void;
}

// ─── Tag chip ────────────────────────────────────────────────────────────────
const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-jtp-xs px-2.5 py-[3px] rounded-jtp-md bg-jtp-blue/10 text-jtp-blue font-medium">
    {children}
  </span>
);

// ─── Read-only checklist ──────────────────────────────────────────────────────
const ChecklistDisplay: React.FC<{ title: string; items: { text: string }[] }> = ({ title, items }) => (
  <div>
    <div className="jtp-label mb-2">{title}</div>
    {items.length === 0 ? (
      <p className="text-jtp-md text-jtp-textFaint italic">Not defined</p>
    ) : (
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-jtp-lg text-jtp-textSoft leading-snug">
            <span className="text-jtp-textDim shrink-0 mt-px">·</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const CommunityPlaybookDetailModal: React.FC<CommunityPlaybookDetailModalProps> = ({
  playbook,
  onClose,
}) => {
  const allTags = [
    ...playbook.tradingStyles,
    ...playbook.instruments,
    ...playbook.timeframes,
  ];

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={playbook.name}
      subtitle={`by ${playbook.authorName}`}
      width="lg"
    >
      <div className="space-y-5">
        {/* Overview */}
        <Panel label="OVERVIEW">
          <div className="space-y-3">
            {playbook.coreIdea && (
              <p className="text-jtp-lg text-jtp-textMuted leading-relaxed">{playbook.coreIdea}</p>
            )}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => <Tag key={tag}>{tag}</Tag>)}
              </div>
            )}
          </div>
        </Panel>

        {/* Pros & Cons */}
        {(playbook.pros.length > 0 || playbook.cons.length > 0) && (
          <Panel label="EDGE ANALYSIS">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="jtp-label text-jtp-profit mb-2">PROS</div>
                <ul className="space-y-1">
                  {playbook.pros.filter(Boolean).map((pro, i) => (
                    <li key={i} className="flex gap-2 text-jtp-lg text-jtp-textSoft leading-snug">
                      <span className="text-jtp-profit shrink-0 mt-px">+</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="jtp-label text-jtp-loss mb-2">CONS TO MANAGE</div>
                <ul className="space-y-1">
                  {playbook.cons.filter(Boolean).map((con, i) => (
                    <li key={i} className="flex gap-2 text-jtp-lg text-jtp-textSoft leading-snug">
                      <span className="text-jtp-loss shrink-0 mt-px">−</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        )}

        {/* Setups */}
        {playbook.setups.length > 0 && (
          <Panel label="SETUPS">
            <div className="space-y-4">
              {playbook.setups.map(setup => (
                <div
                  key={setup.id}
                  className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4"
                >
                  <div className="font-semibold text-jtp-lg text-jtp-text mb-4">{setup.name}</div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <ChecklistDisplay title="ENTRY CRITERIA"   items={setup.entryCriteria} />
                      <ChecklistDisplay title="RISK MANAGEMENT"  items={setup.riskManagement} />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="jtp-label mb-1">BEFORE CHART</div>
                        {setup.screenshotBeforeUrl ? (
                          <img
                            src={setup.screenshotBeforeUrl}
                            alt="Before"
                            className="rounded-jtp-md border border-jtp-border w-full"
                          />
                        ) : (
                          <div className="h-24 bg-jtp-shell rounded-jtp-md flex items-center justify-center text-jtp-xs text-jtp-textFaint border border-jtp-borderSubtle">
                            Not provided
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="jtp-label mb-1">AFTER CHART</div>
                        {setup.screenshotAfterUrl ? (
                          <img
                            src={setup.screenshotAfterUrl}
                            alt="After"
                            className="rounded-jtp-md border border-jtp-border w-full"
                          />
                        ) : (
                          <div className="h-24 bg-jtp-shell rounded-jtp-md flex items-center justify-center text-jtp-xs text-jtp-textFaint border border-jtp-borderSubtle">
                            Not provided
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </Drawer>
  );
};

export default CommunityPlaybookDetailModal;
