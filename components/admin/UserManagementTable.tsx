import React, { useState, useMemo } from 'react';
import { AdminUser } from '../../types';
import Input from '../ui/Input';
import StatusBadge from './StatusBadge';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface UserManagementTableProps {
  users: AdminUser[];
  onGrantPro: (user: AdminUser) => void;
  onRefresh: () => void;
}

/** Inline toggle switch for the Bot column. */
const BotToggle: React.FC<{ user: AdminUser; onRefresh: () => void }> = ({ user, onRefresh }) => {
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

  const enabled = !!user.botEnabled;

  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={`Trading Bot for ${user.fullName}`}
      onClick={handleToggle}
      disabled={loading}
      title={enabled ? 'Bot enabled — click to disable' : 'Bot disabled — click to enable'}
      className="relative flex-shrink-0 border-none cursor-pointer rounded-full transition-colors duration-150 disabled:opacity-50"
      style={{
        width: '32px',
        height: '18px',
        background: enabled ? '#4cc38a' : '#131619',
        border: `1px solid ${enabled ? '#3fb37f' : '#232931'}`,
      }}
    >
      <span
        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-150"
        style={{ left: enabled ? '15px' : '2px' }}
      />
    </button>
  );
};

/** Inline toggle switch for the Quant column. */
const QuantToggle: React.FC<{ user: AdminUser; onRefresh: () => void }> = ({ user, onRefresh }) => {
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

  const enabled = !!user.quantEnabled;

  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={`Quant for ${user.fullName}`}
      onClick={handleToggle}
      disabled={loading}
      title={enabled ? 'Quant enabled — click to disable' : 'Quant disabled — click to enable'}
      className="relative flex-shrink-0 border-none cursor-pointer rounded-full transition-colors duration-150 disabled:opacity-50"
      style={{
        width: '32px',
        height: '18px',
        background: enabled ? '#4cc38a' : '#131619',
        border: `1px solid ${enabled ? '#3fb37f' : '#232931'}`,
      }}
    >
      <span
        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-150"
        style={{ left: enabled ? '15px' : '2px' }}
      />
    </button>
  );
};

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users, onGrantPro, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { accessToken, user: currentUser } = useAuth();

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleRevoke = async (userId: string) => {
    if (window.confirm('Are you sure you want to revoke Pro access for this user?')) {
      if (!accessToken) return;
      try {
        await api.revokeProAccess(userId, accessToken);
        onRefresh();
      } catch (err: any) {
        alert(`Failed to revoke access: ${err.message}`);
      }
    }
  };

  const handleDelete = async (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      alert("You cannot delete your own account from the admin panel.");
      return;
    }
    if (window.confirm('Are you sure you want to PERMANENTLY delete this user?')) {
      if (!accessToken) return;
      try {
        await api.deleteUser(userId, accessToken);
        onRefresh();
      } catch (err: any) {
        alert(`Failed to delete user: ${err.message}`);
      }
    }
  };

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
      {/* Table header bar */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 px-5 py-4 border-b border-jtp-border">
        <h2 className="text-jtp-lg font-semibold text-jtp-text tracking-tight">User Management</h2>
        <div className="w-full md:w-64">
          <Input
            label=""
            id="search-users"
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="mb-0"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-jtp-sm">
          <thead>
            <tr className="bg-jtp-raised border-b border-jtp-border">
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">User</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Role</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Status</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Trial Expires</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">API Usage</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Last Login</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Bot (beta)</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Quant</th>
              <th className="px-4 py-2.5 text-right text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-jtp-textDim text-jtp-sm">
                  No users match your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const isTrialing = user.subscriptionStatus === 'TRIALING';
                const trialExpired = user.trialEndsAt && new Date(user.trialEndsAt) < new Date();
                const isAdmin = user.role === 'ADMIN';

                return (
                  <tr key={user.id} className="border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-jtp-text text-jtp-sm">{user.fullName || 'Unknown'}</p>
                      <p className="text-jtp-xs text-jtp-textDim mt-0.5">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-jtp-xs text-jtp-xs font-medium border ${
                        isAdmin
                          ? 'bg-jtp-blue/10 text-jtp-blue border-jtp-blue/20'
                          : 'bg-jtp-control text-jtp-textMuted border-jtp-borderStrong'
                      }`}>
                        {user.role || 'USER'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-4 py-3">
                      {isTrialing && user.trialEndsAt ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`font-mono text-jtp-xs tabular-nums ${trialExpired ? 'text-jtp-loss' : 'text-jtp-textMuted'}`}>
                            {new Date(user.trialEndsAt).toLocaleDateString()}
                          </span>
                          {trialExpired && (
                            <span className="text-jtp-xs text-jtp-loss uppercase font-medium">Expired</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-jtp-textDim text-jtp-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-jtp-xs text-jtp-text tabular-nums">
                          ${(user.apiUsageCost || 0).toFixed(4)}
                        </span>
                        <span className="text-jtp-xs text-jtp-textDim tabular-nums">
                          {(user.apiUsageTokens || 0).toLocaleString()} tokens
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-jtp-xs text-jtp-textMuted tabular-nums">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <BotToggle user={user} onRefresh={onRefresh} />
                        <span className="text-jtp-xs text-jtp-textDim">
                          {user.botEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <QuantToggle user={user} onRefresh={onRefresh} />
                        <span className="text-jtp-xs text-jtp-textDim">
                          {user.quantEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuItem onSelect={() => onGrantPro(user)}>
                          Grant Pro Access
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={async () => {
                          if (window.confirm(`Are you sure you want to grant LIFETIME access to ${user.fullName}?`)) {
                            if (!accessToken) return;
                            try {
                              await api.grantLifetimeAccess(user.id, accessToken);
                              onRefresh();
                              alert('Lifetime access granted.');
                            } catch (err: any) {
                              alert(`Failed: ${err.message}`);
                            }
                          }
                        }}>
                          Grant Lifetime Access
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={async () => {
                          const daysStr = window.prompt("Enter number of days to extend trial:", "30");
                          if (daysStr) {
                            const days = parseInt(daysStr);
                            if (isNaN(days)) return alert("Invalid number");
                            if (!accessToken) return;
                            try {
                              await api.extendTrial(user.id, days, accessToken);
                              onRefresh();
                              alert(`Trial extended by ${days} days.`);
                            } catch (err: any) {
                              alert(`Failed: ${err.message}`);
                            }
                          }
                        }}>
                          Extend Trial
                        </DropdownMenuItem>
                        {user.proAccessExpiresAt !== undefined && (
                          <DropdownMenuItem onSelect={() => handleRevoke(user.id)} className="text-jtp-loss hover:bg-jtp-loss/10">
                            Revoke Pro Access
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleDelete(user.id)} className="text-jtp-loss hover:bg-jtp-loss/10">
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementTable;
