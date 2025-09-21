import React, { useState, useMemo } from 'react';
import { AdminUser } from '../../types';
import Card from '../Card';
import AuthInput from '../auth/AuthInput';
import StatusBadge from './StatusBadge';

interface UserManagementTableProps {
  users: AdminUser[];
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

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
                    <StatusBadge status={user.subscriptionStatus} />
                </td>
                <td className="p-3 font-tech-mono text-future-gray">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-tech-mono text-future-gray">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UserManagementTable;
