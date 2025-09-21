import React from 'react';
import { TradeJournal } from '../../types';

interface JournalEntryProps {
  journal: TradeJournal;
}

const JournalItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <h5 className="text-xs text-future-gray font-orbitron uppercase mb-1">{label}</h5>
        <p className="text-sm text-future-light bg-future-dark/30 p-2 rounded-md whitespace-pre-wrap">{children}</p>
    </div>
);

const JournalEntry: React.FC<JournalEntryProps> = ({ journal }) => {
  return (
    <div className="space-y-3">
        <JournalItem label="Mindset Before Entry">{journal.mindsetBefore}</JournalItem>
        <JournalItem label="Reasoning for Exit">{journal.exitReasoning}</JournalItem>
        <JournalItem label="Lessons Learned">{journal.lessonsLearned}</JournalItem>
    </div>
  );
};

export default JournalEntry;
