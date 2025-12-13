import React from 'react';
import { AdminUser } from '../../types';

interface StatusBadgeProps {
  user: AdminUser;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ user }) => {
  const status = user.subscriptionStatus;

  if (status === 'ACTIVE') {
    return (
      <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-momentum-green/10 text-momentum-green border-momentum-green/30">
        ACTIVE
      </div>
    );
  }

  const hasGiftedAccess = user.proAccessExpiresAt && new Date(user.proAccessExpiresAt) > new Date();

  if (hasGiftedAccess) {
    return (
      <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-400 border-purple-400/30`}>
        PRO (GIFTED)
      </div>
    );
  }


  const styles: Record<AdminUser['subscriptionStatus'], string> = {
    TRIALING: 'bg-photonic-blue/10 text-photonic-blue border-photonic-blue/30',
    ACTIVE: 'bg-momentum-green/10 text-momentum-green border-momentum-green/30',
    PAST_DUE: 'bg-risk-medium/10 text-risk-medium border-risk-medium/30',
    CANCELED: 'bg-risk-high/10 text-risk-high border-risk-high/30',
  };

  return (
    <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {status}
    </div>
  );
};

export default StatusBadge;