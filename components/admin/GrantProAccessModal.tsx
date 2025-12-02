
import React, { useState } from 'react';
import { AdminUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Textarea from '../ui/Textarea';

interface GrantProAccessModalProps {
  user: AdminUser;
  onSuccess: () => void;
}

const GrantProAccessModal: React.FC<GrantProAccessModalProps> = ({ user, onSuccess }) => {
  const { accessToken } = useAuth();
  const [isLifetime, setIsLifetime] = useState(user.proAccessExpiresAt === null);
  
  const toInputDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const [expiresAt, setExpiresAt] = useState(toInputDate(user.proAccessExpiresAt));
  const [reason, setReason] = useState(user.proAccessReason || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!accessToken) {
      setError('Authentication error.');
      setIsLoading(false);
      return;
    }

    const payload = {
      expiresAt: isLifetime ? null : (expiresAt ? new Date(expiresAt).toISOString() : null),
      reason,
    };
    
    try {
      await api.grantProAccess(user.id, payload, accessToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Checkbox
          id="isLifetime"
          label="Grant Lifetime Access"
          checked={isLifetime}
          onChange={(e) => setIsLifetime(e.target.checked)}
        />
      </div>
      
      {!isLifetime && (
         <Input
            label="Access Expires At"
            id="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
        />
      )}
      
      <Textarea
        label="Reason (optional)"
        id="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Beta tester, giveaway winner"
      />
      
      {error && <p className="text-risk-high text-sm text-center my-2">{error}</p>}
      
      <div className="mt-6">
        <Button type="submit" isLoading={isLoading} className="w-full">
          Update Pro Access
        </Button>
      </div>
    </form>
  );
};

export default GrantProAccessModal;
