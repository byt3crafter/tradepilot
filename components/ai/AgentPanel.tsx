import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { AgentRun, AgentTool } from '../../types';
import Card from '../Card';

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

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// ─── Toggle switch (shared look with AiSettings) ────────────────────────────────

const Toggle: React.FC<{
  enabled: boolean;
  busy?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}> = ({ enabled, busy, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    disabled={busy}
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex flex-shrink-0 h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-jtp-borderFocus ${
      enabled ? 'bg-jtp-profit' : 'bg-jtp-control border border-jtp-borderStrong'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Chip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-md text-jtp-xs font-medium border ${
      className ?? 'bg-jtp-control text-jtp-textDim border-jtp-borderStrong'
    }`}
  >
    {children}
  </span>
);

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

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-jtp-xl font-semibold text-jtp-text">Agent Tools &amp; Skills</h2>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="text-jtp-sm font-medium text-jtp-blue hover:underline whitespace-nowrap"
        >
          {showForm ? 'Cancel' : '+ Add Skill'}
        </button>
      </div>
      <p className="text-jtp-md text-jtp-textDim mb-4">
        Tools and skills the AI agent can call while researching and acting on your behalf. Disable any
        you don't want it to use.
      </p>

      {/* Add-skill form */}
      {showForm && (
        <div className="bg-jtp-raised border border-jtp-border rounded-jtp-lg p-5 space-y-3 mb-4">
          <p className="text-jtp-xs text-jtp-textMuted leading-relaxed">
            Install an external skill the agent can call. Must be an https endpoint; it receives the
            agent's args (GET query / POST JSON).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Skill name"
              spellCheck={false}
              className="bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              spellCheck={false}
              className="bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this skill do? (helps the agent decide when to call it)"
            spellCheck={false}
            className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
          />
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
              className="bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/skill"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text placeholder:text-jtp-textDim placeholder:font-sans focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {adding ? <Spinner /> : null}
              {adding ? 'Adding…' : 'Add Skill'}
            </button>
          </div>
          {formError && (
            <p role="alert" className="text-jtp-xs text-jtp-loss">
              {formError}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-jtp-xs text-jtp-loss mb-2">
          {error}
        </p>
      )}

      {/* Tools list */}
      {loading ? (
        <div className="flex items-center gap-2 text-jtp-textDim">
          <Spinner />
          <span className="text-jtp-sm">Loading tools…</span>
        </div>
      ) : tools.length === 0 ? (
        <p className="text-jtp-sm text-jtp-textDim">No tools registered yet.</p>
      ) : (
        <div className="bg-jtp-raised border border-jtp-border rounded-jtp-lg divide-y divide-jtp-border">
          {tools.map((tool) => (
            <div key={tool.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-jtp-md font-medium text-jtp-text">{tool.name}</span>
                  <span className="font-mono text-jtp-xs text-jtp-textDim">{tool.key}</span>
                  {tool.category && <Chip>{tool.category}</Chip>}
                  {tool.kind === 'builtin' ? (
                    <Chip className="bg-[rgba(59,130,246,0.12)] text-jtp-blue border-[rgba(59,130,246,0.25)]">builtin</Chip>
                  ) : (
                    <Chip className="bg-[rgba(168,85,247,0.12)] text-[#c084fc] border-[rgba(168,85,247,0.25)]">http</Chip>
                  )}
                </div>
                <p className="text-jtp-sm text-jtp-textDim mt-1">{tool.description}</p>
                {tool.kind === 'http' && tool.httpUrl && (
                  <p className="font-mono text-jtp-xs text-jtp-textMuted mt-1 truncate">
                    {tool.httpMethod} {tool.httpUrl}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Toggle
                  enabled={tool.enabled}
                  busy={busyId === tool.id}
                  label={`Enable ${tool.name}`}
                  onChange={(next) => handleToggle(tool, next)}
                />
                {!tool.builtin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(tool)}
                    disabled={busyId === tool.id}
                    aria-label={`Delete ${tool.name}`}
                    title="Delete skill"
                    className="p-1.5 rounded-md text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ─── Agent Activity (audit / debug log) card ──────────────────────────────────

const statusBadge = (status: AgentRun['status']): string => {
  switch (status) {
    case 'done':
      return 'bg-[rgba(34,197,94,0.12)] text-jtp-profit border-[rgba(34,197,94,0.25)]';
    case 'limit':
      return 'bg-[rgba(217,162,59,0.12)] text-jtp-warning border-[rgba(217,162,59,0.25)]';
    case 'error':
    default:
      return 'bg-[rgba(239,68,68,0.12)] text-jtp-loss border-[rgba(239,68,68,0.25)]';
  }
};

const truncate = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s);

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
    <Card>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-jtp-xl font-semibold text-jtp-text">Agent Activity</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-jtp-sm font-medium text-jtp-blue hover:underline"
        >
          Refresh
        </button>
      </div>
      <p className="text-jtp-md text-jtp-textDim mb-4">
        A debug log of recent agent runs. Click a run to inspect exactly which tools it called, the
        arguments it sent, and what came back.
      </p>

      {error && (
        <p role="alert" className="text-jtp-xs text-jtp-loss mb-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-jtp-textDim">
          <Spinner />
          <span className="text-jtp-sm">Loading runs…</span>
        </div>
      ) : runs.length === 0 ? (
        <p className="text-jtp-sm text-jtp-textDim">No agent runs yet. They'll appear here once the agent runs.</p>
      ) : (
        <div className="bg-jtp-raised border border-jtp-border rounded-jtp-lg divide-y divide-jtp-border">
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-jtp-xs font-medium border ${statusBadge(run.status)}`}>
                    {run.status}
                  </span>
                  <span className="flex-1 min-w-0 text-jtp-sm text-jtp-text truncate">
                    {truncate(run.goal || '(no goal)', 90)}
                  </span>
                  <span className="text-jtp-xs text-jtp-textDim whitespace-nowrap hidden sm:inline">
                    {run.steps?.length ?? 0} {(run.steps?.length ?? 0) === 1 ? 'step' : 'steps'}
                  </span>
                  <span className="text-jtp-xs text-jtp-textMuted whitespace-nowrap font-mono">
                    {run.durationMs}ms
                  </span>
                  <span className="text-jtp-xs text-jtp-textMuted whitespace-nowrap hidden sm:inline">
                    {relativeTime(run.createdAt)}
                  </span>
                  <span className="text-jtp-textDim text-jtp-xs">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-3">
                    {run.answer && (
                      <div>
                        <p className="text-jtp-xs font-medium text-jtp-textDim uppercase tracking-wide mb-1">Answer</p>
                        <div className="bg-jtp-bg border border-jtp-border rounded-md p-3 text-jtp-sm text-jtp-text whitespace-pre-wrap">
                          {run.answer}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-jtp-xs font-medium text-jtp-textDim uppercase tracking-wide mb-1">
                        Steps ({run.steps?.length ?? 0})
                      </p>
                      {(!run.steps || run.steps.length === 0) ? (
                        <p className="text-jtp-xs text-jtp-textMuted">No tool calls were made.</p>
                      ) : (
                        <ol className="space-y-2">
                          {run.steps.map((step, i) => (
                            <li key={i} className="bg-jtp-bg border border-jtp-border rounded-md p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-mono text-jtp-xs text-jtp-textMuted">#{i + 1}</span>
                                <span className="font-mono text-jtp-sm font-medium text-jtp-blue">{step.tool}</span>
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
    </Card>
  );
};

// ─── Public panel ─────────────────────────────────────────────────────────────

const AgentPanel: React.FC = () => (
  <>
    <AgentToolsCard />
    <AgentActivityCard />
  </>
);

export default AgentPanel;
