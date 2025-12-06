import React, { useEffect, useState } from 'react';
import Card from '../Card';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../Spinner';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ComplianceReportModal from '../compliance/ComplianceReportModal';

interface DrawdownData {
  accountName: string;
  templateName?: string | null;
  firmName?: string | null;
  totalProfitLoss: number;
  profitLossPercentage: number;
  profitTarget?: number | null;
  profitTargetProgress?: number | null;
  profitTargetRemaining?: number | null;
  maxDrawdownLimit?: number | null;
  dailyDrawdownLimit?: number | null;
  currentMaxDrawdown: number;
  currentDailyDrawdown: number;
  maxDrawdownPercentage?: number | null;
  dailyDrawdownPercentage?: number | null;
  minTradingDays?: number | null;
  daysTradedCount: number;
  daysTradedProgress?: number | null;
  isCompliant: boolean;
  violations: string[];
}

const ChallengeProgressCard: React.FC = () => {
  const { activeAccount } = useAccount();
  const { accessToken } = useAuth();
  const [drawdownData, setDrawdownData] = useState<DrawdownData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const fetchDrawdownData = async () => {
      if (!activeAccount || !accessToken) return;

      // Only fetch for PROP_FIRM accounts with objectives enabled
      if (activeAccount.type !== 'PROP_FIRM' || !activeAccount.objectives?.isEnabled) {
        setDrawdownData(null);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const data = await api.getDrawdownCalculation(accessToken, activeAccount.id);
        setDrawdownData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load challenge progress');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrawdownData();

    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchDrawdownData, 30000);
    return () => clearInterval(interval);
  }, [activeAccount, accessToken]);

  if (!activeAccount || activeAccount.type !== 'PROP_FIRM' || !activeAccount.objectives?.isEnabled) {
    return null;
  }

  if (isLoading && !drawdownData) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-400 text-sm">{error}</p>
      </Card>
    );
  }

  if (!drawdownData) return null;

  const getProgressColor = (percentage: number | null | undefined, isInverse = false) => {
    if (percentage === null || percentage === undefined) return 'bg-gray-400';
    if (isInverse) {
      // For drawdown - higher is worse
      if (percentage >= 90) return 'bg-red-500';
      if (percentage >= 70) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      // For profit/days - higher is better
      if (percentage >= 100) return 'bg-green-500';
      if (percentage >= 70) return 'bg-yellow-500';
      return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="p-4 border-white/10">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-orbitron text-white">Challenge Progress</h3>
            {drawdownData.templateName && (
              <p className="text-xs text-secondary mt-1">
                {drawdownData.templateName} {drawdownData.firmName && `(${drawdownData.firmName})`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                drawdownData.isCompliant
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {drawdownData.isCompliant ? 'Compliant' : 'Violations'}
            </div>
            <Button
              variant="secondary"
              onClick={() => setIsExportModalOpen(true)}
              className="text-xs px-3 py-1"
            >
              Export Report
            </Button>
          </div>
        </div>

        {drawdownData.violations.length > 0 && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
            <p className="text-xs font-semibold text-red-400 mb-1">Active Violations:</p>
            <ul className="text-xs text-red-300 space-y-1">
              {drawdownData.violations.map((violation, idx) => (
                <li key={idx}>• {violation}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Profit Target */}
        {drawdownData.profitTarget && (
          <Card className="p-4 border-white/10">
            <h4 className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">
              Profit Target
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-orbitron text-white">
                  ${drawdownData.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-secondary">
                  / ${drawdownData.profitTarget.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(drawdownData.profitTargetProgress)}`}
                  style={{ width: `${Math.min(drawdownData.profitTargetProgress || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-secondary">
                {drawdownData.profitTargetProgress?.toFixed(1)}% complete • $
                {drawdownData.profitTargetRemaining?.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                remaining
              </p>
            </div>
          </Card>
        )}

        {/* Max Drawdown */}
        {drawdownData.maxDrawdownLimit && (
          <Card className="p-4 border-white/10">
            <h4 className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">
              Max Drawdown
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-orbitron text-white">
                  ${Math.abs(drawdownData.currentMaxDrawdown).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-secondary">
                  / ${drawdownData.maxDrawdownLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(drawdownData.maxDrawdownPercentage, true)}`}
                  style={{ width: `${Math.min(drawdownData.maxDrawdownPercentage || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-secondary">
                {drawdownData.maxDrawdownPercentage?.toFixed(1)}% used • $
                {(drawdownData.maxDrawdownLimit - Math.abs(drawdownData.currentMaxDrawdown)).toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                buffer
              </p>
            </div>
          </Card>
        )}

        {/* Daily Drawdown */}
        {drawdownData.dailyDrawdownLimit && (
          <Card className="p-4 border-white/10">
            <h4 className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">
              Daily Drawdown
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-orbitron text-white">
                  ${Math.abs(drawdownData.currentDailyDrawdown).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-secondary">
                  / ${drawdownData.dailyDrawdownLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(drawdownData.dailyDrawdownPercentage, true)}`}
                  style={{ width: `${Math.min(drawdownData.dailyDrawdownPercentage || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-secondary">
                {drawdownData.dailyDrawdownPercentage?.toFixed(1)}% used • Resets at midnight
              </p>
            </div>
          </Card>
        )}

        {/* Trading Days */}
        {drawdownData.minTradingDays && (
          <Card className="p-4 border-white/10">
            <h4 className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">
              Trading Days
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-orbitron text-white">{drawdownData.daysTradedCount}</span>
                <span className="text-xs text-secondary">/ {drawdownData.minTradingDays} days</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(drawdownData.daysTradedProgress)}`}
                  style={{ width: `${Math.min(drawdownData.daysTradedProgress || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-secondary">
                {drawdownData.daysTradedProgress?.toFixed(1)}% complete •{' '}
                {Math.max(drawdownData.minTradingDays - drawdownData.daysTradedCount, 0)} days remaining
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <Modal title="Export Compliance Report" onClose={() => setIsExportModalOpen(false)}>
          <ComplianceReportModal onClose={() => setIsExportModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
};

export default ChallengeProgressCard;
