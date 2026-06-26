/**
 * GenerateInviteModal — Operator Console modal for generating invite links.
 *
 * Uses the kit Modal, Field, SelectInput, Input, and Button.
 */
import React, { useState } from 'react';
import {
  Modal,
  Field,
  Input,
  SelectInput,
  Button,
} from '../ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface GenerateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GenerateInviteModal: React.FC<GenerateInviteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { accessToken } = useAuth();
  const [type, setType] = useState<'TRIAL' | 'LIFETIME'>('TRIAL');
  const [duration, setDuration] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await api.generateInvite(
        type,
        type === 'TRIAL' ? duration : undefined,
        accessToken,
      );
      setGeneratedCode(res.code);
      onSuccess();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!generatedCode) return;
    const link = `${window.location.origin}/join/${generatedCode}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const handleClose = () => {
    setGeneratedCode(null);
    onClose();
  };

  return (
    <Modal title="Generate Invite Link" onClose={handleClose} size="md">
      {generatedCode ? (
        /* ── Success state ─────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Generated code display */}
          <div className="p-4 bg-jtp-profit/10 border border-jtp-profit/20 rounded-jtp-panel text-center">
            <p className="font-mono text-jtp-xs text-jtp-profit font-semibold uppercase tracking-[0.12em] mb-2">
              Invite Code Generated
            </p>
            <p className="font-mono text-jtp-3xl text-jtp-text tracking-[0.2em] font-bold">
              {generatedCode}
            </p>
          </div>

          {/* Copy link row */}
          <div className="flex gap-2 items-stretch">
            <Input
              id="invite-link-display"
              readOnly
              value={`${window.location.origin}/join/${generatedCode}`}
              className="font-mono text-jtp-xs flex-1"
              containerClassName="mb-0 flex-1"
            />
            <Button
              onClick={copyLink}
              className="flex-shrink-0 text-jtp-sm h-auto px-4"
            >
              Copy
            </Button>
          </div>

          <Button
            variant="secondary"
            onClick={handleClose}
            className="w-full text-jtp-sm"
          >
            Done
          </Button>
        </div>
      ) : (
        /* ── Create form ────────────────────────────────────────────────── */
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectInput
            id="invite-type"
            label="TYPE"
            value={type}
            onChange={(e) => setType(e.target.value as 'TRIAL' | 'LIFETIME')}
            options={[
              { value: 'TRIAL', label: 'Trial Access' },
              { value: 'LIFETIME', label: 'Lifetime Access' },
            ]}
            containerClassName="mb-0"
          />

          {type === 'TRIAL' && (
            <Field label="DURATION (DAYS)" htmlFor="invite-duration">
              <Input
                id="invite-duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="font-mono"
                containerClassName="mb-0"
              />
            </Field>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Generate Link
          </Button>
        </form>
      )}
    </Modal>
  );
};

export default GenerateInviteModal;
