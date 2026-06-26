import React from 'react';
import { AdminUser } from '../../types';

interface StatusBadgeProps {
  user: AdminUser;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ user }) => {
  const status = user.subscriptionStatus;

  const hasGiftedAccess = user.proAccessExpiresAt && new Date(user.proAccessExpiresAt) > new Date();

  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border bg-jtp-profit/10 text-jtp-profit border-jtp-profit/25">
        ACTIVE
      </span>
    );
  }

  if (hasGiftedAccess) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border bg-purple-500/10 text-purple-400 border-purple-400/25">
        PRO (GIFTED)
      </span>
    );
  }

  const styles: Record<AdminUser['subscriptionStatus'], string> = {
    TRIALING: 'bg-jtp-blue/10 text-jtp-blue border-jtp-blue/25',
    ACTIVE: 'bg-jtp-profit/10 text-jtp-profit border-jtp-profit/25',
    PAST_DUE: 'bg-jtp-warning/10 text-jtp-warning border-jtp-warning/25',
    CANCELED: 'bg-jtp-loss/10 text-jtp-loss border-jtp-loss/25',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
