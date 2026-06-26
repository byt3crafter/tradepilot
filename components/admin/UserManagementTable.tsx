/**
 * UserManagementTable — Operator Console user registry.
 *
 * Uses DataTable + Panel from the kit. Bot/Quant toggles use the kit's
 * toggle styling. Role and status are rendered as kit Badge chips.
 */
import React, { useState, useMemo } from 'react';
import { AdminUser } from '../../types';
import {
  Panel,
  DataTable,
  Badge,
  EmptyState,
  Input,
  DropdownMenu,
} from '../ui';
import { DropdownMenuItem } from '../ui/DropdownMenu';
import type { TableColumn } from '../ui';
import type { BadgeVariant } from '../ui';
import StatusBadge from './StatusBadge';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface UserManagementTableProps {
  users: AdminUser[];
  onGrantPro: (user: AdminUser) => void;
  onRefresh: () => void;
}

/* ─── Inline toggle (styled to match kit ToggleSwitch but label-free) ─────── */
const AdminToggle: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  isLoading: boolean;
  ariaLabel: string;
}> = ({ enabled, onToggle, isLoading, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={ariaLabel}
    onClick={onToggle}
    disabled={isLoading}
    className={[
      'relative inline-flex items-center rounded-full transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-jtp-panel focus:ring-jtp-blue',
      'disabled:opacity-50 cursor-pointer',
      enabled
        ? 'bg-jtp-blue'
        : 'bg-jtp-control border border-jtp-borderStrong',
    ].join(' ')}
    style={{ width: '32px', height: '18px', flexShrink: 0 }}
  >
    <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
    <span
      className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-150 shadow-sm"
      style={{ left: enabled ? '15px' : '2px' }}
    />
  </button>
);

/* ─── Bot toggle ──────────────────────────────────────────────────────────── */
const BotToggle: React.FC<{ user: AdminUser; onRefresh: () => void }> = ({
  user,
  onRefresh,
}) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await api.setUserBotEnabled(user.id, !user.botEnabled, accessToken);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update bot access: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <AdminToggle
        enabled={!!user.botEnabled}
        onToggle={handleToggle}
        isLoading={loading}
        ariaLabel={`Trading Bot for ${user.fullName}`}
      />
      <span
        className={`font-mono text-[9px] uppercase tracking-wider font-semibold ${
          user.botEnabled ? 'text-jtp-blue' : 'text-jtp-textDim'
        }`}
      >
        {user.botEnabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
};

/* ─── Quant toggle ────────────────────────────────────────────────────────── */
const QuantToggle: React.FC<{ user: AdminUser; onRefresh: () => void }> = ({
  user,
  onRefresh,
}) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await api.setUserQuantEnabled(user.id, !user.quantEnabled, accessToken);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update Quant access: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <AdminToggle
        enabled={!!user.quantEnabled}
        onToggle={handleToggle}
        isLoading={loading}
        ariaLabel={`Quant for ${user.fullName}`}
      />
      <span
        className={`font-mono text-[9px] uppercase tracking-wider font-semibold ${
          user.quantEnabled ? 'text-jtp-blue' : 'text-jtp-textDim'
        }`}
      >
        {user.quantEnabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
};

/* ─── Main table component ────────────────────────────────────────────────── */
const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  onGrantPro,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { accessToken, user: currentUser } = useAuth();

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const q = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q),
    );
  }, [users, searchTerm]);

  const handleRevoke = async (userId: string) => {
    if (!window.confirm('Revoke Pro access for this user?')) return;
    if (!accessToken) return;
    try {
      await api.revokeProAccess(userId, accessToken);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to revoke access: ${err.message}`);
    }
  };

  const handleDelete = async (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      alert('You cannot delete your own account from the admin panel.');
      return;
    }
    if (!window.confirm('PERMANENTLY delete this user? This cannot be undone.')) return;
    if (!accessToken) return;
    try {
      await api.deleteUser(userId, accessToken);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const columns: TableColumn<AdminUser>[] = [
    {
      key: 'fullName',
      header: 'USER',
      render: (_, row) => (
        <div>
          <p className="font-medium text-jtp-text text-jtp-md leading-snug">
            {row.fullName || 'Unknown'}
          </p>
          <p className="font-mono text-jtp-xs text-jtp-textDim mt-0.5">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'ROLE',
      width: '72px',
      render: (role) => {
        const v: BadgeVariant = role === 'ADMIN' ? 'info' : 'neutral';
        return <Badge variant={v} size="xs">{role || 'USER'}</Badge>;
      },
    },
    {
      key: 'subscriptionStatus',
      header: 'STATUS',
      render: (_, row) => <StatusBadge user={row} />,
    },
    {
      key: 'trialEndsAt',
      header: 'TRIAL',
      render: (date, row) => {
        if (row.subscriptionStatus !== 'TRIALING' || !date) {
          return <span className="text-jtp-textDim text-jtp-xs">—</span>;
        }
        const expired = new Date(date) < new Date();
        return (
          <div>
            <span
              className={`font-mono text-jtp-xs tabular-nums ${
                expired ? 'text-jtp-loss' : 'text-jtp-textMuted'
              }`}
            >
              {new Date(date).toLocaleDateString()}
            </span>
            {expired && (
              <div className="mt-0.5">
                <Badge variant="loss" size="xs">EXPIRED</Badge>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'apiUsageCost',
      header: 'API COST',
      align: 'right',
      render: (cost, row) => (
        <div className="text-right">
          <div className="font-mono text-jtp-xs text-jtp-text tabular-nums font-semibold">
            ${(cost || 0).toFixed(4)}
          </div>
          <div className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
            {(row.apiUsageTokens || 0).toLocaleString()} tkns
          </div>
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'LAST LOGIN',
      render: (date) => (
        <span className="font-mono text-jtp-xs text-jtp-textMuted tabular-nums">
          {date ? new Date(date).toLocaleString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'botEnabled',
      header: 'BOT',
      align: 'center',
      width: '64px',
      render: (_, row) => (
        <div className="flex justify-center">
          <BotToggle user={row} onRefresh={onRefresh} />
        </div>
      ),
    },
    {
      key: 'quantEnabled',
      header: 'QUANT',
      align: 'center',
      width: '64px',
      render: (_, row) => (
        <div className="flex justify-center">
          <QuantToggle user={row} onRefresh={onRefresh} />
        </div>
      ),
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      width: '48px',
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuItem onSelect={() => onGrantPro(row)}>
            Grant Pro Access
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              if (!window.confirm(`Grant LIFETIME access to ${row.fullName}?`)) return;
              if (!accessToken) return;
              try {
                await api.grantLifetimeAccess(row.id, accessToken);
                onRefresh();
                alert('Lifetime access granted.');
              } catch (err: any) {
                alert(`Failed: ${err.message}`);
              }
            }}
          >
            Grant Lifetime Access
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              const daysStr = window.prompt('Extend trial by how many days?', '30');
              if (!daysStr) return;
              const days = parseInt(daysStr, 10);
              if (isNaN(days)) { alert('Invalid number'); return; }
              if (!accessToken) return;
              try {
                await api.extendTrial(row.id, days, accessToken);
                onRefresh();
                alert(`Trial extended by ${days} days.`);
              } catch (err: any) {
                alert(`Failed: ${err.message}`);
              }
            }}
          >
            Extend Trial
          </DropdownMenuItem>
          {row.proAccessExpiresAt !== undefined && (
            <DropdownMenuItem
              onSelect={() => handleRevoke(row.id)}
              className="text-jtp-loss hover:bg-jtp-loss/10"
            >
              Revoke Pro Access
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => handleDelete(row.id)}
            className="text-jtp-loss hover:bg-jtp-loss/10"
          >
            Delete User
          </DropdownMenuItem>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <Panel
      label={`USER REGISTRY${users.length ? ` (${users.length})` : ''}`}
      noPadding
      actions={
        <Input
          id="search-users"
          type="search"
          placeholder="Search by name or email…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          containerClassName="mb-0 w-52"
        />
      }
    >
      {filteredUsers.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'No users match your search' : 'No users yet'}
          description={
            searchTerm
              ? `Try a different name or email.`
              : 'Users will appear here once they register.'
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          keyFn={(u) => u.id}
          emptyMessage="No users found."
        />
      )}
    </Panel>
  );
};

export default UserManagementTable;
