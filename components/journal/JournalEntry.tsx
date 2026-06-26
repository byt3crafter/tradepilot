import React from 'react';
import { TradeJournal } from '../../types';

interface JournalEntryProps {
  journal: TradeJournal;
}

const JournalItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <h5 className="jtp-label mb-1.5">{label}</h5>
    <p className="text-jtp-lg text-jtp-textSoft bg-jtp-raised px-3 py-2.5 rounded-jtp-md whitespace-pre-wrap leading-relaxed">
      {children}
    </p>
  </div>
);

const JournalEntry: React.FC<JournalEntryProps> = ({ journal }) => {
  return (
    <div className="space-y-4">
      <JournalItem label="MINDSET BEFORE ENTRY">{journal.mindsetBefore}</JournalItem>
      <JournalItem label="REASONING FOR EXIT">{journal.exitReasoning}</JournalItem>
      <JournalItem label="LESSONS LEARNED">{journal.lessonsLearned}</JournalItem>
    </div>
  );
};

export default JournalEntry;
