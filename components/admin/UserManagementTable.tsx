import React, { useState, useMemo } from 'react';
import { AdminUser } from '../../types';
import Card from '../Card';
import AuthInput from '../auth/AuthInput';
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
  const { accessToken } = useAuth();

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleRevoke = async (userId: string) => {
    if (window.confirm('Are you sure you want to revoke Pro access for this user? They will revert to their Paddle subscription status.')) {
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
    if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
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
          <AuthInput 
            label=""
            id="search-users"
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto table-scrollbar">
        <table className="w-full text-sm">
          <thead className="border-b border-photonic-blue/30">
            <tr>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">User</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Status</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Registered</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Last Login</th>
              <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b border-future-panel/50 hover:bg-photonic-blue/5">
                <td className="p-3">
                  <p className="font-semibold text-future-light">{user.fullName}</p>
                  <p className="text-xs text-future-gray">{user.email}</p>
                </td>
                <td className="p-3">
                    <StatusBadge user={user} />
                </td>
                <td className="p-3 font-tech-mono text-future-gray">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-tech-mono text-future-gray">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
                <td className="p-3">
                  <DropdownMenu>
                    <DropdownMenuItem onSelect={() => onGrantPro(user)}>
                      Grant Pro Access
                    </DropdownMenuItem>
                    {(user.proAccessExpiresAt) && (
                      <DropdownMenuItem onSelect={() => handleRevoke(user.id)} className="text-risk-high hover:bg-risk-high/10">
                        Revoke Pro Access
                      </DropdownMenuItem>
                    )}
                    <div className="my-1 border-t border-photonic-blue/10"></div>
                     <DropdownMenuItem onSelect={() => handleDelete(user.id)} className="text-risk-high hover:bg-risk-high/10">
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UserManagementTable;