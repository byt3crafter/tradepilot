/**
 * GrantProAccessModal — Grant or update Pro access for a user.
 *
 * Uses Field + Input + Checkbox + Textarea + Button from the kit.
 */
import React, { useState } from 'react';
import { AdminUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Field, Input, Checkbox, Textarea, Button } from '../ui';

interface GrantProAccessModalProps {
  user: AdminUser;
  onSuccess: () => void;
}

const toInputDate = (dateString?: string | null) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const GrantProAccessModal: React.FC<GrantProAccessModalProps> = ({ user, onSuccess }) => {
  const { accessToken } = useAuth();
  const [isLifetime, setIsLifetime] = useState(user.proAccessExpiresAt === null);
  const [expiresAt, setExpiresAt] = useState(toInputDate(user.proAccessExpiresAt));
  const [reason, setReason] = useState(user.proAccessReason || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) { setError('Authentication error.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const payload = {
        expiresAt: isLifetime ? null : (expiresAt ? new Date(expiresAt).toISOString() : null),
        reason,
      };
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
      {/* User info reminder */}
      <div className="bg-jtp-raised border border-jtp-border rounded-jtp-md px-4 py-3">
        <p className="text-jtp-md text-jtp-textMuted">
          Updating Pro access for{' '}
          <span className="font-semibold text-jtp-text">{user.fullName}</span>
        </p>
        <p className="font-mono text-jtp-xs text-jtp-textDim mt-0.5">{user.email}</p>
      </div>

      {/* Lifetime toggle */}
      <Checkbox
        id="isLifetime"
        label="Grant Lifetime Access (no expiry)"
        checked={isLifetime}
        onChange={(e) => setIsLifetime(e.target.checked)}
      />

      {/* Expiry date — hidden when lifetime */}
      {!isLifetime && (
        <Field label="ACCESS EXPIRES AT" htmlFor="expiresAt">
          <Input
            id="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            containerClassName="mb-0"
          />
        </Field>
      )}

      {/* Reason */}
      <Field label="REASON (OPTIONAL)" htmlFor="pro-reason">
        <Textarea
          id="pro-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Beta tester, giveaway winner"
          rows={3}
        />
      </Field>

      {/* Error */}
      {error && (
        <p className="text-jtp-loss text-jtp-md text-center">{error}</p>
      )}

      {/* Submit */}
      <Button type="submit" isLoading={isLoading} className="w-full">
        Update Pro Access
      </Button>
    </form>
  );
};

export default GrantProAccessModal;
