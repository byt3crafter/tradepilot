/**
 * StatusBadge — renders an AdminUser's subscription status as a kit Badge.
 */
import React from 'react';
import { Badge } from '../ui';
import type { BadgeVariant } from '../ui';
import { AdminUser } from '../../types';

interface StatusBadgeProps {
  user: AdminUser;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE:   'profit',
  TRIALING: 'info',
  PAST_DUE: 'warning',
  CANCELED: 'loss',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ user }) => {
  const hasGiftedAccess =
    user.proAccessExpiresAt && new Date(user.proAccessExpiresAt) > new Date();

  if (hasGiftedAccess) {
    return <Badge variant="info" size="sm">PRO GIFTED</Badge>;
  }

  const variant: BadgeVariant = STATUS_VARIANT[user.subscriptionStatus] ?? 'neutral';
  return (
    <Badge variant={variant} size="sm">
      {user.subscriptionStatus}
    </Badge>
  );
};

export default StatusBadge;
