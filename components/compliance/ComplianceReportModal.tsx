import React, { useState } from 'react';
import Button from '../ui/Button';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../Spinner';

interface ComplianceReportModalProps {
  onClose: () => void;
}

const ComplianceReportModal: React.FC<ComplianceReportModalProps> = ({ onClose }) => {
  const { activeAccount } = useAccount();
  const { accessToken } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeJournal, setIncludeJournal] = useState(true);
  const [includeAiNotes, setIncludeAiNotes] = useState(true);
  const [includeScreenshots, setIncludeScreenshots] = useState(false);

  const handleGenerate = async () => {
    if (!activeAccount || !accessToken) return;

    setIsGenerating(true);
    setError('');

    try {
      const params = new URLSearchParams({
        accountId: activeAccount.id,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        includeJournal: includeJournal.toString(),
        includeAiNotes: includeAiNotes.toString(),
        includeScreenshots: includeScreenshots.toString(),
      });

      const response = await fetch(`/api/pdf/compliance-report?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${activeAccount.name}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!activeAccount) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Generate Compliance Report</h3>
        <p className="text-sm text-secondary">
          Export a comprehensive PDF report with your challenge progress, trade history, and compliance status.
        </p>
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-white">Date Range (Optional)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-secondary mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-photonic-blue"
            />
          </div>
        </div>
        <p className="text-xs text-secondary">Leave empty to include all trades</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white">Include in Report</h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeJournal}
            onChange={(e) => setIncludeJournal(e.target.checked)}
            className="w-4 h-4 bg-white/5 border border-white/10 rounded"
          />
          <div>
            <span className="text-sm text-white">Trade Journal Entries</span>
            <p className="text-xs text-secondary">Include mindset, exit reasoning, and lessons learned</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeAiNotes}
            onChange={(e) => setIncludeAiNotes(e.target.checked)}
            className="w-4 h-4 bg-white/5 border border-white/10 rounded"
          />
          <div>
            <span className="text-sm text-white">AI Analysis Notes</span>
            <p className="text-xs text-secondary">Include AI-generated trade analysis and feedback</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer opacity-50 pointer-events-none">
          <input
            type="checkbox"
            checked={includeScreenshots}
            onChange={(e) => setIncludeScreenshots(e.target.checked)}
            className="w-4 h-4 bg-white/5 border border-white/10 rounded"
            disabled
          />
          <div>
            <span className="text-sm text-white">Trade Screenshots</span>
            <p className="text-xs text-secondary">Coming soon</p>
          </div>
        </label>
      </div>

      {/* Report Preview Info */}
      <div className="bg-photonic-blue/10 border border-photonic-blue/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-photonic-blue mb-2">Report Includes:</h4>
        <ul className="text-xs text-secondary space-y-1">
          <li>• Executive summary with compliance status</li>
          <li>• Challenge progress metrics (profit, drawdown, trading days)</li>
          <li>• Complete trade history table</li>
          <li>• Compliance checklist with pass/fail indicators</li>
          {includeJournal && <li>• Trade journal entries and notes</li>}
          {includeAiNotes && <li>• AI-generated trade analysis</li>}
        </ul>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating} className="w-auto">
          {isGenerating ? (
            <>
              <Spinner />
              <span className="ml-2">Generating...</span>
            </>
          ) : (
            'Generate PDF Report'
          )}
        </Button>
      </div>
    </div>
  );
};

export default ComplianceReportModal;
