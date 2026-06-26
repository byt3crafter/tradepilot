/**
 * ReferralDashboard — Operator Console view for the referral program.
 *
 * StatTile for total count + Panel/DataTable for invite codes,
 * top referrers, and recent referrals.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Panel,
  StatTile,
  DataTable,
  Badge,
  Button,
  Skeleton,
  EmptyState,
} from '../ui';
import type { TableColumn } from '../ui';
import type { BadgeVariant } from '../ui';
import GenerateInviteModal from './GenerateInviteModal';

interface ReferralStats {
  totalReferrals: number;
  topReferrers: {
    id: string;
    fullName: string;
    email: string;
    referralCount: number;
  }[];
  recentReferrals: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
    subscriptionStatus: string;
    hasRewardedReferrer: boolean;
    referrer: { id: string; fullName: string };
  }[];
}

interface InviteCode {
  id: string;
  code: string;
  type: 'TRIAL' | 'LIFETIME';
  duration?: number;
  isUsed: boolean;
  createdAt: string;
  usedByUser?: { id: string; fullName: string; email: string };
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE:   'profit',
  TRIALING: 'info',
  PAST_DUE: 'warning',
  CANCELED: 'loss',
};

const ReferralDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const fetchData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [statsData, invitesData] = await Promise.all([
        api.getReferralStats(accessToken),
        api.getInvites(accessToken),
      ]);
      setStats(statsData);
      setInvites(invitesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton variant="stat" />
        </div>
        <Skeleton variant="panel" className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton variant="panel" className="h-64" />
          <Skeleton variant="panel" className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-jtp-loss/10 border border-jtp-loss/20 rounded-jtp-panel p-5 text-center">
        <p className="text-jtp-lg text-jtp-loss font-medium">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  /* ── Invite codes columns ─────────────────────────────────────────────── */
  const inviteCols: TableColumn<InviteCode>[] = [
    {
      key: 'code',
      header: 'CODE',
      mono: true,
      render: (code) => (
        <span className="font-mono text-jtp-md text-jtp-profit font-semibold tracking-wider">
          {code}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'TYPE',
      width: '96px',
      render: (type) => (
        <Badge variant={type === 'LIFETIME' ? 'profit' : 'info'} size="xs">
          {type}
        </Badge>
      ),
    },
    {
      key: 'duration',
      header: 'DURATION',
      mono: true,
      render: (d) => (
        <span className="font-mono text-jtp-xs text-jtp-textMuted tabular-nums">
          {d ? `${d} days` : '∞'}
        </span>
      ),
    },
    {
      key: 'isUsed',
      header: 'STATUS',
      align: 'center',
      width: '80px',
      render: (used) => (
        <Badge variant={used ? 'neutral' : 'profit'} size="xs">
          {used ? 'USED' : 'ACTIVE'}
        </Badge>
      ),
    },
    {
      key: 'usedByUser',
      header: 'USED BY',
      align: 'right',
      render: (user) =>
        user ? (
          <div className="text-right">
            <div className="text-jtp-md text-jtp-textMuted font-medium">{user.fullName}</div>
            <div className="font-mono text-jtp-xs text-jtp-textDim">{user.email}</div>
          </div>
        ) : (
          <span className="text-jtp-textDim text-jtp-xs">—</span>
        ),
    },
  ];

  /* ── Top referrers columns ────────────────────────────────────────────── */
  const referrerCols: TableColumn<ReferralStats['topReferrers'][0]>[] = [
    {
      key: 'fullName',
      header: 'USER',
      render: (name, row) => (
        <div>
          <p className="font-medium text-jtp-text text-jtp-md">{name}</p>
          <p className="font-mono text-jtp-xs text-jtp-textDim mt-0.5">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'referralCount',
      header: 'REFERRALS',
      align: 'right',
      mono: true,
      render: (n) => (
        <span className="font-mono text-jtp-md font-bold text-jtp-profit tabular-nums">{n}</span>
      ),
    },
  ];

  /* ── Recent referrals columns ─────────────────────────────────────────── */
  const recentCols: TableColumn<ReferralStats['recentReferrals'][0]>[] = [
    {
      key: 'fullName',
      header: 'REFERRED USER',
      render: (name, row) => (
        <div>
          <p className="font-medium text-jtp-text text-jtp-md">{name}</p>
          <p className="font-mono text-jtp-xs text-jtp-textDim mt-0.5">
            {new Date(row.createdAt).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      key: 'referrer',
      header: 'REFERRED BY',
      render: (r) => (
        <span className="text-jtp-md text-jtp-textMuted">{r?.fullName || 'Unknown'}</span>
      ),
    },
    {
      key: 'subscriptionStatus',
      header: 'STATUS',
      render: (status) => {
        const v: BadgeVariant = STATUS_VARIANT[status] ?? 'neutral';
        return <Badge variant={v} size="xs">{status}</Badge>;
      },
    },
    {
      key: 'hasRewardedReferrer',
      header: 'REWARD',
      align: 'right',
      render: (paid) => (
        <Badge variant={paid ? 'profit' : 'neutral'} size="xs">
          {paid ? 'PAID' : 'PENDING'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hero stat + action */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <StatTile
            label="TOTAL REFERRALS"
            value={String(stats.totalReferrals)}
            valueColor="text-jtp-profit"
          />
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex-shrink-0 mt-0 text-jtp-sm h-9 px-4"
        >
          + Generate Invite
        </Button>
      </div>

      {/* Invite codes */}
      <Panel label="INVITE CODES" noPadding>
        {invites.length === 0 ? (
          <EmptyState
            title="No invite codes"
            description="Generate invite links to track sign-ups."
            action={
              <Button onClick={() => setIsInviteModalOpen(true)} className="text-jtp-sm">
                Generate Invite
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={inviteCols}
            data={invites}
            keyFn={(i) => i.id}
            emptyMessage="No invite codes generated yet."
          />
        )}
      </Panel>

      {/* Top Referrers + Recent Referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel label="TOP REFERRERS" noPadding>
          {stats.topReferrers.length === 0 ? (
            <EmptyState title="No referrers yet" description="Referrers will appear when users start inviting others." />
          ) : (
            <DataTable
              columns={referrerCols}
              data={stats.topReferrers}
              keyFn={(r) => r.id}
              emptyMessage="No referrers yet."
            />
          )}
        </Panel>

        <Panel label="RECENT REFERRALS" noPadding>
          {stats.recentReferrals.length === 0 ? (
            <EmptyState title="No referrals yet" description="Recent referred sign-ups will appear here." />
          ) : (
            <DataTable
              columns={recentCols}
              data={stats.recentReferrals}
              keyFn={(r) => r.id}
              emptyMessage="No referrals yet."
            />
          )}
        </Panel>
      </div>

      <GenerateInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => { fetchData(); }}
      />
    </div>
  );
};

export default ReferralDashboard;
