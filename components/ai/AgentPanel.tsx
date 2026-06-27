import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { AgentRun, AgentTool, ScheduledAgent, ScheduledAgentFrequency } from '../../types';
import { Panel, Badge, ToggleSwitch, Button, DataTable, Input, SelectInput } from '../ui';
import type { TableColumn } from '../ui';

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin text-jtp-textDim ${className ?? 'w-4 h-4'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── Trash icon ───────────────────────────────────────────────────────────────

const TrashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── helpers ────────────────────────────────────────────────────────────────

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const relativeFuture = (iso: string | null): string => {
  if (!iso) return '—';
  const when = new Date(iso).getTime();
  if (Number.isNaN(when)) return '—';
  const diff = when - Date.now();
  if (diff <= 0) return 'due now';
  const s = Math.round(diff / 1000);
  if (s < 60) return `in ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
};

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const truncate = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s);

// ─── Agent Tools & Skills card ────────────────────────────────────────────────

const AgentToolsCard: React.FC = () => {
  const { getToken } = useAuth();

  const [tools, setTools] = useState<AgentTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add-skill form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const list = await api.aiTools(token);
      setTools(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load agent tools.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = useCallback(
    async (tool: AgentTool, next: boolean) => {
      setBusyId(tool.id);
      setError(null);
      // optimistic
      setTools((prev) => prev.map((t) => (t.id === tool.id ? { ...t, enabled: next } : t)));
      try {
        const token = await getToken();
        await api.aiToggleTool(tool.id, next, token);
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Could not update that tool.');
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [getToken, refresh],
  );

  const handleDelete = useCallback(
    async (tool: AgentTool) => {
      if (typeof window !== 'undefined' && !window.confirm(`Delete skill "${tool.name}"?`)) return;
      setBusyId(tool.id);
      setError(null);
      try {
        const token = await getToken();
        await api.aiDeleteTool(tool.id, token);
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Could not delete that skill.');
      } finally {
        setBusyId(null);
      }
    },
    [getToken, refresh],
  );

  const handleAdd = useCallback(async () => {
    setFormError(null);
    const n = name.trim();
    const d = description.trim();
    const u = url.trim();
    if (!n) {
      setFormError('Give the skill a name.');
      return;
    }
    if (!/^https:\/\//i.test(u)) {
      setFormError('URL must be an https endpoint.');
      return;
    }
    setAdding(true);
    try {
      const token = await getToken();
      await api.aiAddTool({ name: n, description: d, method, url: u, category: category.trim() || undefined }, token);
      setName('');
      setDescription('');
      setUrl('');
      setCategory('');
      setMethod('GET');
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      setFormError(e?.message || 'Could not add the skill.');
    } finally {
      setAdding(false);
    }
  }, [name, description, method, url, category, getToken, refresh]);

  const toolColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'TOOL / SKILL',
      render: (_v, row) => (
        <div className="py-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-jtp-md font-medium text-jtp-text">{row.name}</span>
            <span className="font-mono text-jtp-xs text-jtp-textDim">{row.key}</span>
            {row.category && (
              <Badge variant="neutral" size="xs">{row.category}</Badge>
            )}
            <Badge variant={row.kind === 'builtin' ? 'info' : 'neutral'} size="xs">
              {row.kind === 'builtin' ? 'BUILTIN' : 'HTTP'}
            </Badge>
          </div>
          {row.description && (
            <p className="text-jtp-md text-jtp-textMuted mt-0.5">{row.description}</p>
          )}
          {row.kind === 'http' && row.httpUrl && (
            <p className="font-mono text-jtp-xs text-jtp-textMuted mt-0.5 truncate">
              {row.httpMethod} {row.httpUrl}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'TYPE',
      width: '80px',
      render: (_v, row) => (
        <Badge variant={row.kind === 'builtin' ? 'info' : 'neutral'} size="xs">
          {row.kind === 'builtin' ? 'BUILTIN' : 'HTTP'}
        </Badge>
      ),
    },
    {
      key: 'enabled',
      header: 'ENABLED',
      width: '80px',
      align: 'center',
      render: (v, row) => (
        <div className="flex justify-center">
          <ToggleSwitch
            label=""
            checked={v}
            onChange={(next) => handleToggle(row as AgentTool, next)}
            disabled={busyId === row.id}
          />
        </div>
      ),
    },
    {
      key: 'id',
      header: '',
      width: '48px',
      align: 'right',
      render: (_v, row) =>
        !row.builtin ? (
          <button
            type="button"
            onClick={() => handleDelete(row as AgentTool)}
            disabled={busyId === row.id}
            aria-label={`Delete ${row.name}`}
            title="Delete skill"
            className="p-1.5 rounded-[2px] text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon />
          </button>
        ) : null,
    },
  ];

  return (
    <Panel
      label="AGENT TOOLS & SKILLS"
      noPadding
      actions={
        <Button variant="link" onClick={() => setShowForm((s) => !s)} className="text-jtp-md">
          {showForm ? 'Cancel' : '+ Add Skill'}
        </Button>
      }
    >
      {/* Add-skill form */}
      {showForm && (
        <div className="p-4 border-b border-jtp-border space-y-3">
          <p className="text-jtp-md text-jtp-textMuted leading-relaxed">
            Install an external skill the agent can call. Must be an https endpoint; it receives the
            agent's args (GET query / POST JSON).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              id="skill-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Skill name"
              spellCheck={false}
              containerClassName="mb-0"
            />
            <Input
              id="skill-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              spellCheck={false}
              containerClassName="mb-0"
            />
          </div>
          <Input
            id="skill-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this skill do?"
            spellCheck={false}
            containerClassName="mb-0"
          />
          <div className="flex flex-col sm:flex-row gap-2.5 items-end">
            <SelectInput
              id="skill-method"
              containerClassName="mb-0 w-24 flex-shrink-0"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
              ]}
            />
            <Input
              id="skill-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/skill"
              spellCheck={false}
              autoComplete="off"
              containerClassName="flex-1 mb-0"
            />
            <Button onClick={handleAdd} isLoading={adding} disabled={adding} className="whitespace-nowrap">
              {adding ? 'Adding…' : 'Add Skill'}
            </Button>
          </div>
          {formError && (
            <p role="alert" className="text-jtp-md text-jtp-loss">{formError}</p>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-2">
          <p role="alert" className="text-jtp-md text-jtp-loss">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-jtp-textMuted p-4">
          <Spinner />
          <span className="text-jtp-md">Loading tools…</span>
        </div>
      ) : (
        <DataTable
          columns={toolColumns}
          data={tools as any[]}
          keyFn={(t) => t.id}
          emptyMessage="No tools registered yet."
        />
      )}
    </Panel>
  );
};

// ─── Scheduled Agents card ──────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: { value: ScheduledAgentFrequency; label: string; chip: string }[] = [
  { value: '15m',    label: 'Every 15m', chip: '15m' },
  { value: 'hourly', label: 'Hourly',    chip: 'Hourly' },
  { value: '6h',     label: 'Every 6h',  chip: '6h' },
  { value: 'daily',  label: 'Daily',     chip: 'Daily' },
];

const frequencyChip = (f: ScheduledAgentFrequency): string =>
  FREQUENCY_OPTIONS.find((o) => o.value === f)?.chip ?? f;

const truncateGoal = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s);

const ScheduledAgentsCard: React.FC = () => {
  const { getToken } = useAuth();

  const [schedules, setSchedules] = useState<ScheduledAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  // New-schedule form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [frequency, setFrequency] = useState<ScheduledAgentFrequency>('daily');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const list = await api.aiSchedules(token);
      setSchedules(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load scheduled agents.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = useCallback(
    async (schedule: ScheduledAgent, next: boolean) => {
      setBusyId(schedule.id);
      setError(null);
      // optimistic
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? { ...s, enabled: next } : s)));
      try {
        const token = await getToken();
        await api.aiUpdateSchedule(schedule.id, { enabled: next }, token);
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Could not update that schedule.');
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [getToken, refresh],
  );

  const handleRunNow = useCallback(
    async (schedule: ScheduledAgent) => {
      setRunningId(schedule.id);
      setError(null);
      try {
        const token = await getToken();
        await api.aiRunScheduleNow(schedule.id, token);
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Could not run that agent.');
      } finally {
        setRunningId(null);
      }
    },
    [getToken, refresh],
  );

  const handleDelete = useCallback(
    async (schedule: ScheduledAgent) => {
      if (typeof window !== 'undefined' && !window.confirm(`Delete scheduled agent "${schedule.name}"?`)) return;
      setBusyId(schedule.id);
      setError(null);
      try {
        const token = await getToken();
        await api.aiDeleteSchedule(schedule.id, token);
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Could not delete that schedule.');
      } finally {
        setBusyId(null);
      }
    },
    [getToken, refresh],
  );

  const handleCreate = useCallback(async () => {
    setFormError(null);
    const n = name.trim();
    const g = goal.trim();
    if (!n) {
      setFormError('Give the agent a name.');
      return;
    }
    if (!g) {
      setFormError('Describe what the agent should do.');
      return;
    }
    setCreating(true);
    try {
      const token = await getToken();
      await api.aiCreateSchedule({ name: n, goal: g, frequency }, token);
      setName('');
      setGoal('');
      setFrequency('daily');
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      setFormError(e?.message || 'Could not create the scheduled agent.');
    } finally {
      setCreating(false);
    }
  }, [name, goal, frequency, getToken, refresh]);

  return (
    <Panel
      label="SCHEDULED AGENTS"
      actions={
        <Button variant="link" onClick={() => setShowForm((s) => !s)} className="text-jtp-md">
          {showForm ? 'Cancel' : '+ New Schedule'}
        </Button>
      }
    >
      <p className="text-jtp-md text-jtp-textMuted mb-4">
        Autonomous agents that run on a timer using your tools, then log to Activity and notify you.
      </p>

      {/* New-schedule form */}
      {showForm && (
        <div className="bg-jtp-raised border border-jtp-border rounded-[2px] p-4 space-y-3 mb-4">
          <Input
            id="schedule-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agent name"
            spellCheck={false}
            containerClassName="mb-0"
          />
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What should this agent do each run? (e.g. Review my open trades and flag any that breach my risk rules)"
            rows={3}
            spellCheck={false}
            className="w-full bg-jtp-control border border-jtp-borderStrong rounded-[2px] px-3 py-2 text-jtp-md text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue transition-colors resize-y"
          />
          <div className="flex flex-col sm:flex-row gap-2.5 items-end">
            <SelectInput
              id="schedule-frequency"
              containerClassName="mb-0"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScheduledAgentFrequency)}
              options={FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <Button onClick={handleCreate} isLoading={creating} disabled={creating} className="whitespace-nowrap">
              {creating ? 'Creating…' : 'Create agent'}
            </Button>
          </div>
          {formError && (
            <p role="alert" className="text-jtp-md text-jtp-loss">{formError}</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-jtp-md text-jtp-loss mb-2">{error}</p>
      )}

      {/* Schedules list */}
      {loading ? (
        <div className="flex items-center gap-2 text-jtp-textMuted">
          <Spinner />
          <span className="text-jtp-md">Loading scheduled agents…</span>
        </div>
      ) : schedules.length === 0 ? (
        <p className="text-jtp-md text-jtp-textMuted">No scheduled agents yet.</p>
      ) : (
        <div className="bg-jtp-raised border border-jtp-border rounded-[2px] divide-y divide-jtp-border mt-2">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-jtp-md font-medium text-jtp-text">{schedule.name}</span>
                  <Badge variant="info" size="xs">{frequencyChip(schedule.frequency)}</Badge>
                </div>
                <p className="text-jtp-md text-jtp-textMuted mt-0.5">{truncateGoal(schedule.goal, 140)}</p>
                <p className="text-jtp-md font-mono text-jtp-textMuted mt-0.5">
                  Last: {schedule.lastRunAt ? relativeTime(schedule.lastRunAt) : 'never'} · Next:{' '}
                  {schedule.enabled ? relativeFuture(schedule.nextRunAt) : 'paused'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => handleRunNow(schedule)}
                  isLoading={runningId === schedule.id}
                  disabled={runningId === schedule.id || busyId === schedule.id}
                  className="px-3 py-1.5 text-jtp-md whitespace-nowrap"
                >
                  {runningId === schedule.id ? 'Running…' : 'Run now'}
                </Button>
                <ToggleSwitch
                  label=""
                  checked={schedule.enabled}
                  onChange={(next) => handleToggle(schedule, next)}
                  disabled={busyId === schedule.id}
                />
                <button
                  type="button"
                  onClick={() => handleDelete(schedule)}
                  disabled={busyId === schedule.id}
                  aria-label={`Delete ${schedule.name}`}
                  title="Delete scheduled agent"
                  className="p-1.5 rounded-[2px] text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-jtp-md text-jtp-textMuted mt-3">
        Scheduled runs use your connected ChatGPT/Codex quota.
      </p>
    </Panel>
  );
};

// ─── Agent Activity (audit / debug log) card ──────────────────────────────────

const statusVariant = (status: AgentRun['status']): 'profit' | 'warning' | 'loss' => {
  switch (status) {
    case 'done':  return 'profit';
    case 'limit': return 'warning';
    case 'error':
    default:      return 'loss';
  }
};

const AgentActivityCard: React.FC = () => {
  const { getToken } = useAuth();

  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const list = await api.aiRuns(token);
      setRuns(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load agent activity.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Panel
      label="AGENT ACTIVITY"
      actions={
        <Button variant="link" onClick={refresh} className="text-jtp-md">
          Refresh
        </Button>
      }
    >
      <p className="text-jtp-md text-jtp-textMuted mb-4">
        A debug log of recent agent runs. Click a run to inspect exactly which tools it called, the
        arguments it sent, and what came back.
      </p>

      {error && (
        <p role="alert" className="text-jtp-md text-jtp-loss mb-2">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-jtp-textMuted">
          <Spinner />
          <span className="text-jtp-md">Loading runs…</span>
        </div>
      ) : runs.length === 0 ? (
        <p className="text-jtp-md text-jtp-textMuted">
          No agent runs yet. They'll appear here once the agent runs.
        </p>
      ) : (
        <div className="bg-jtp-raised border border-jtp-border rounded-[2px] divide-y divide-jtp-border">
          {runs.map((run) => {
            const open = expandedId === run.id;
            return (
              <div key={run.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : run.id)}
                  className="w-full text-left p-4 flex items-center gap-3 hover:bg-jtp-control/40 transition-colors"
                  aria-expanded={open}
                >
                  <Badge variant={statusVariant(run.status)} size="xs">{run.status}</Badge>
                  <span className="flex-1 min-w-0 text-jtp-md text-jtp-text truncate">
                    {truncate(run.goal || '(no goal)', 90)}
                  </span>
                  <span className="text-jtp-md text-jtp-textMuted whitespace-nowrap hidden sm:inline">
                    {run.steps?.length ?? 0} {(run.steps?.length ?? 0) === 1 ? 'step' : 'steps'}
                  </span>
                  <span className="font-mono text-jtp-md text-jtp-textMuted whitespace-nowrap">
                    {run.durationMs}ms
                  </span>
                  <span className="font-mono text-jtp-md text-jtp-textMuted whitespace-nowrap hidden sm:inline">
                    {relativeTime(run.createdAt)}
                  </span>
                  <span className="text-jtp-textDim text-jtp-xs">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-3">
                    {run.answer && (
                      <div>
                        <p className="jtp-label mb-1">ANSWER</p>
                        <div className="bg-jtp-bg border border-jtp-border rounded-[2px] p-3 text-jtp-md text-jtp-text whitespace-pre-wrap">
                          {run.answer}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="jtp-label mb-1">STEPS ({run.steps?.length ?? 0})</p>
                      {(!run.steps || run.steps.length === 0) ? (
                        <p className="text-jtp-md text-jtp-textMuted">No tool calls were made.</p>
                      ) : (
                        <ol className="space-y-2">
                          {run.steps.map((step, i) => (
                            <li key={i} className="bg-jtp-bg border border-jtp-border rounded-[2px] p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-mono text-jtp-xs text-jtp-textMuted">#{i + 1}</span>
                                <span className="font-mono text-jtp-md font-medium text-jtp-blue">{step.tool}</span>
                                {step.ts !== undefined && (
                                  <span className="ml-auto font-mono text-jtp-xs text-jtp-textMuted">
                                    {typeof step.ts === 'number' ? new Date(step.ts).toLocaleTimeString() : step.ts}
                                  </span>
                                )}
                              </div>
                              {step.args !== undefined && step.args !== null && (
                                <div className="mb-1.5">
                                  <p className="text-jtp-xs text-jtp-textDim mb-0.5">args</p>
                                  <pre className="font-mono text-jtp-xs text-jtp-text bg-jtp-control rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                    {stringify(step.args)}
                                  </pre>
                                </div>
                              )}
                              {step.result !== undefined && step.result !== null && (
                                <div>
                                  <p className="text-jtp-xs text-jtp-textDim mb-0.5">result</p>
                                  <pre className="font-mono text-jtp-xs text-jtp-textDim bg-jtp-control rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                                    {stringify(step.result)}
                                  </pre>
                                </div>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
};

// ─── Public panel ─────────────────────────────────────────────────────────────

const AgentPanel: React.FC = () => (
  <>
    <AgentToolsCard />
    <ScheduledAgentsCard />
    <AgentActivityCard />
  </>
);

export default AgentPanel;
