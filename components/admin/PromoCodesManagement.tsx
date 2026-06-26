/**
 * PromoCodesManagement — Operator Console promo codes section.
 *
 * Two Panels: create form (collapsible) + live codes DataTable.
 * Uses Field/Input/SelectInput from the kit for the form.
 */
import React, { useState, useEffect } from 'react';
import {
  Panel,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  SelectInput,
  EmptyState,
  Skeleton,
} from '../ui';
import type { TableColumn } from '../ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

const PromoCodesManagement: React.FC = () => {
  const { accessToken } = useAuth();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: 0,
    maxUses: '',
    expiresAt: '',
  });

  const fetchCodes = async () => {
    if (!accessToken) return;
    try {
      const data = await api.getPromoCodes(accessToken);
      setCodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    try {
      await api.createPromoCode(
        {
          ...newCode,
          value: Number(newCode.value),
          maxUses: newCode.maxUses ? Number(newCode.maxUses) : undefined,
          expiresAt: newCode.expiresAt ? new Date(newCode.expiresAt) : undefined,
        },
        accessToken,
      );
      setIsCreating(false);
      setNewCode({ code: '', type: 'PERCENTAGE', value: 0, maxUses: '', expiresAt: '' });
      fetchCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken || !window.confirm('Delete this promo code?')) return;
    try {
      await api.deletePromoCode(id, accessToken);
      fetchCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: TableColumn<PromoCode>[] = [
    {
      key: 'code',
      header: 'CODE',
      mono: true,
      render: (code) => (
        <span className="font-mono text-jtp-md text-jtp-profit font-semibold tracking-wider uppercase">
          {code}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'TYPE',
      width: '120px',
      render: (type) => (
        <Badge variant="neutral" size="xs">
          {type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED $'}
        </Badge>
      ),
    },
    {
      key: 'value',
      header: 'DISCOUNT',
      align: 'right',
      mono: true,
      render: (v, row) => (
        <span className="font-mono text-jtp-md text-jtp-text tabular-nums font-semibold">
          {row.type === 'PERCENTAGE' ? `${v}%` : `$${v}`}
        </span>
      ),
    },
    {
      key: 'usedCount',
      header: 'USAGE',
      align: 'right',
      mono: true,
      render: (used, row) => (
        <span className="font-mono text-jtp-xs text-jtp-textMuted tabular-nums">
          {used}
          {row.maxUses ? ` / ${row.maxUses}` : ''}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'EXPIRES',
      render: (date) => (
        <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
          {date ? new Date(date).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'STATUS',
      align: 'center',
      width: '80px',
      render: (active) => (
        <Badge variant={active ? 'profit' : 'neutral'} size="xs">
          {active ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      width: '48px',
      render: (_, row) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1.5 text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-loss/10 rounded-jtp-sm transition-colors"
          aria-label="Delete promo code"
          title="Delete promo code"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Create form panel (collapsible) */}
      {isCreating && (
        <Panel label="NEW PROMO CODE">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="CODE" htmlFor="promo-code" required>
                <Input
                  id="promo-code"
                  required
                  value={newCode.code}
                  onChange={(e) =>
                    setNewCode({ ...newCode, code: e.target.value.toUpperCase() })
                  }
                  className="font-mono uppercase tracking-widest"
                  placeholder="SUMMER2025"
                  containerClassName="mb-0"
                />
              </Field>

              <SelectInput
                id="promo-type"
                label="TYPE"
                value={newCode.type}
                onChange={(e) =>
                  setNewCode({ ...newCode, type: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })
                }
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                  { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' },
                ]}
                containerClassName="mb-0"
              />

              <Field label="VALUE" htmlFor="promo-value" required>
                <Input
                  id="promo-value"
                  type="number"
                  required
                  value={newCode.value}
                  onChange={(e) =>
                    setNewCode({ ...newCode, value: Number(e.target.value) })
                  }
                  className="font-mono"
                  containerClassName="mb-0"
                />
              </Field>

              <Field label="MAX USES (optional)" htmlFor="promo-maxuses">
                <Input
                  id="promo-maxuses"
                  type="number"
                  value={newCode.maxUses}
                  onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                  className="font-mono"
                  placeholder="Unlimited"
                  containerClassName="mb-0"
                />
              </Field>

              <Field label="EXPIRES AT (optional)" htmlFor="promo-expires">
                <Input
                  id="promo-expires"
                  type="date"
                  value={newCode.expiresAt}
                  onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                  containerClassName="mb-0"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-jtp-border">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-jtp-sm h-8 px-4"
              >
                Cancel
              </Button>
              <Button type="submit" className="text-jtp-sm h-8 px-4">
                Create Code
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {/* Codes table */}
      <Panel
        label={`PROMO CODES${codes.length ? ` (${codes.length})` : ''}`}
        noPadding
        actions={
          !isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              className="h-7 px-3 text-jtp-xs"
            >
              <PlusIcon className="w-3 h-3 mr-1" />
              Create Code
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton variant="text" lines={5} />
          </div>
        ) : codes.length === 0 ? (
          <EmptyState
            title="No promo codes"
            description="Create the first promo code to offer discounts."
            action={
              <Button onClick={() => setIsCreating(true)} className="text-jtp-sm">
                Create Code
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={codes}
            keyFn={(c) => c.id}
            emptyMessage="No promo codes found."
          />
        )}
      </Panel>
    </div>
  );
};

export default PromoCodesManagement;
