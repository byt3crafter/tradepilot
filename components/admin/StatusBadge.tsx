import React from 'react';
import { User } from '../../types';

interface StatusBadgeProps {
  status: User['subscriptionStatus'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<User['subscriptionStatus'], string> = {
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
