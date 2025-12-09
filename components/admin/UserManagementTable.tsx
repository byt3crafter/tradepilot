
import React, { useState, useMemo } from 'react';
import { AdminUser } from '../../types';
import Card from '../Card';
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
    <Card>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
        <h2 className="text-xl font-orbitron text-photonic-blue">User Management</h2>
        <div className="w-full md:w-72">
          <Input
            label=""
            id="search-users"
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="mb-0"
          />
        </div>
      </div>
      <div className="overflow-x-auto table-scrollbar">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">User</th>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">Role</th>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">Status</th>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">Trial Expires</th>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">API Usage</th>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">Last Login</th>
              <th className="p-3 text-left font-orbitron text-white/80 uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const isTrialing = user.subscriptionStatus === 'TRIALING';
              const trialExpired = user.trialEndsAt && new Date(user.trialEndsAt) < new Date();
              const isAdmin = user.role === 'ADMIN';

              return (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <p className="font-semibold text-white">{user.fullName || 'Unknown'}</p>
                    <p className="text-xs text-secondary">{user.email}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isAdmin
                      ? 'bg-photonic-blue/10 text-photonic-blue border border-photonic-blue/20'
                      : 'bg-white/5 text-secondary border border-white/10'
                      }`}>
                      {user.role || 'USER'}
                    </span>
                  </td>
                  <td className="p-3">
                    <StatusBadge user={user} />
                  </td>
                  <td className="p-3">
                    {isTrialing && user.trialEndsAt ? (
                      <div className="flex flex-col">
                        <span className={`font-tech-mono text-xs ${trialExpired ? 'text-risk-high' : 'text-secondary'}`}>
                          {new Date(user.trialEndsAt).toLocaleDateString()}
                        </span>
                        {trialExpired && (
                          <span className="text-[10px] text-risk-high uppercase">Expired</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-secondary">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-tech-mono text-xs text-white">
                        ${(user.apiUsageCost || 0).toFixed(4)}
                      </span>
                      <span className="text-[10px] text-secondary">
                        {(user.apiUsageTokens || 0).toLocaleString()} tokens
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-tech-mono text-secondary text-xs">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-3">
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
                        <DropdownMenuItem onSelect={() => handleRevoke(user.id)} className="text-risk-high hover:bg-risk-high/10">
                          Revoke Pro Access
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => handleDelete(user.id)} className="text-risk-high hover:bg-risk-high/10">
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UserManagementTable;
