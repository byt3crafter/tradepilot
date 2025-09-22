import React, { useState } from 'react';
import { AdminUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Checkbox from '../ui/Checkbox';
import Textarea from '../ui/Textarea';

interface GrantProAccessModalProps {
  user: AdminUser;
  onSuccess: () => void;
}

const GrantProAccessModal: React.FC<GrantProAccessModalProps> = ({ user, onSuccess }) => {
  const { accessToken } = useAuth();
  
  const isCurrentlyLifetime = user.proAccessExpiresAt && new Date(user.proAccessExpiresAt).getFullYear() > 9000;
  const [isLifetime, setIsLifetime] = useState(isCurrentlyLifetime);
  
  const toInputDate = (dateString?: string | null) => {
    if (!dateString || (new Date(dateString).getFullYear() > 9000)) return '';
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

    // Use a far-future date to represent "lifetime" to avoid null/undefined ambiguity
    const lifetimeDate = '9999-12-31T23:59:59.999Z';

    const payload = {
      expiresAt: isLifetime ? lifetimeDate : (expiresAt ? new Date(expiresAt).toISOString() : null),
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
         <AuthInput
            label="Access Expires At"
            id="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
        />
      )}
      
      <Textarea
        label="Reason (optional, for internal notes)"
        id="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Beta tester, giveaway winner"
      />
      
      {error && <p className="text-risk-high text-sm text-center my-2">{error}</p>}
      
      <div className="mt-6">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : 'Update Pro Access'}
        </Button>
      </div>
    </form>
  );
};

export default GrantProAccessModal;