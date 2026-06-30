import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import { useAuth } from '../../context/AuthContext';
import { brainStreamUrl } from '../../services/api';
import type { BrainEvent, BrainScoreboard, BrainScoreboardModule } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  tick:     '#3a7bd5',
  research: '#00d1ff',
  recall:   '#a855f7',
  decide:   '#e8a23d',
  skip:     '#565d66',
  execute:  '#3ddc84',
  learn:    '#ff5b9e',
  note:     '#9aa3ad',
};

const KIND_ICONS: Record<string, string> = {
  tick:     '⬡',
  research: '◎',
  recall:   '◈',
  decide:   '◆',
  skip:     '◦',
  execute:  '▶',
  learn:    '✦',
  note:     '◻',
};

// The six pipeline stages that map to brain network nodes
const PIPELINE_NODES = ['tick', 'research', 'recall', 'decide', 'execute', 'learn'] as const;
type PipelineNode = typeof PIPELINE_NODES[number];

// Hexagonal node positions in a 300×300 viewBox
// Center: (150, 150), radius: 95 — perfect hexagon, top-first
const NODE_POS: Record<PipelineNode, { x: number; y: number }> = {
  tick:     { x: 150, y: 55  },
  research: { x: 232, y: 103 },
  recall:   { x: 232, y: 198 },
  decide:   { x: 150, y: 245 },
  execute:  { x: 68,  y: 198 },
  learn:    { x: 68,  y: 103 },
};

// Sequential pipeline edges (direction of flow)
const PIPELINE_EDGES: Array<[PipelineNode, PipelineNode]> = [
  ['tick',     'research'],
  ['research', 'recall'],
  ['recall',   'decide'],
  ['decide',   'execute'],
  ['execute',  'learn'],
  ['learn',    'tick'],
];

// Subtle cross-connections for a richer graph feel (always dim)
const AMBIENT_EDGES: Array<[PipelineNode, PipelineNode]> = [
  ['tick',     'recall'],
  ['research', 'decide'],
  ['recall',   'execute'],
  ['decide',   'learn'],
];

const MODULES = ['all', 'polymarket', 'crypto', 'forex'] as const;
type ModuleFilter = typeof MODULES[number];

const MAX_FEED_EVENTS = 80;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getApiBase(): string {
  return (window as any).APP_CONFIG?.API_URL || 'http://localhost:8080';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Quadratic bezier path string curving gently toward the hexagon center */
function edgePath(from: PipelineNode, to: PipelineNode): string {
  const a = NODE_POS[from];
  const b = NODE_POS[to];
  // Control point: midpoint pulled 12% toward center (150, 150)
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const cx = mx + (150 - mx) * 0.12;
  const cy = my + (150 - my) * 0.12;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

function ambientEdgePath(from: PipelineNode, to: PipelineNode): string {
  const a = NODE_POS[from];
  const b = NODE_POS[to];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Slightly exaggerated curve through center for cross-connections
  const cx = mx + (150 - mx) * 0.4;
  const cy = my + (150 - my) * 0.4;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

function prevPipelineNode(kind: PipelineNode): PipelineNode {
  const idx = PIPELINE_NODES.indexOf(kind);
  return idx === 0
    ? PIPELINE_NODES[PIPELINE_NODES.length - 1]
    : PIPELINE_NODES[idx - 1];
}

// ─── Brain SVG Network ─────────────────────────────────────────────────────────

interface Particle {
  id: string;
  from: PipelineNode;
  to: PipelineNode;
  color: string;
}

const BrainNetwork = memo(function BrainNetwork({
  activeNodes,
  activationKeys,
  particles,
}: {
  activeNodes: Set<string>;
  activationKeys: Record<string, number>;
  particles: Particle[];
}) {
  return (
    <svg
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
      role="img"
    >
      <defs>
        {/* Bloom glow — used for active node rings and particles */}
        <filter id="brain-bloom" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Softer glow — active edges */}
        <filter id="brain-glow-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Particle glow */}
        <filter id="particle-bloom" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Radial gradient for central core */}
        <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central ambient glow */}
      <circle cx="150" cy="150" r="80" fill="url(#core-gradient)" />

      {/* Ambient cross-connections (always dim) */}
      {AMBIENT_EDGES.map(([from, to]) => (
        <path
          key={`ambient-${from}-${to}`}
          d={ambientEdgePath(from, to)}
          stroke="#1b2026"
          strokeWidth="0.6"
          fill="none"
          strokeDasharray="2 6"
          opacity="0.6"
        />
      ))}

      {/* Pipeline edges */}
      {PIPELINE_EDGES.map(([from, to]) => {
        const isActive = activeNodes.has(from);
        const fromColor = KIND_COLORS[from] || '#333';
        const path = edgePath(from, to);
        return (
          <g key={`edge-${from}-${to}`}>
            {/* Base dim line */}
            <path
              d={path}
              stroke={isActive ? fromColor : '#1e2530'}
              strokeWidth={isActive ? 1.5 : 0.8}
              fill="none"
              opacity={isActive ? 0.7 : 1}
              style={{ transition: 'stroke 0.4s ease, stroke-width 0.4s ease, opacity 0.4s ease' }}
            />
            {/* Active glow overlay */}
            {isActive && (
              <path
                d={path}
                stroke={fromColor}
                strokeWidth="4"
                fill="none"
                opacity="0.25"
                filter="url(#brain-glow-soft)"
              />
            )}
          </g>
        );
      })}

      {/* Synapse particles */}
      {particles.map(p => {
        const path = edgePath(p.from, p.to);
        return (
          <g key={p.id}>
            {/* Trail glow */}
            <circle r="8" fill={p.color} opacity="0.15" filter="url(#particle-bloom)">
              <animateMotion dur="0.75s" begin="0s" fill="remove" path={path} />
            </circle>
            {/* Core dot */}
            <circle r="3.5" fill={p.color} opacity="1" filter="url(#brain-bloom)">
              <animateMotion dur="0.75s" begin="0s" fill="remove" path={path} />
            </circle>
          </g>
        );
      })}

      {/* Neural nodes */}
      {PIPELINE_NODES.map((kind, i) => {
        const pos = NODE_POS[kind];
        const color = KIND_COLORS[kind];
        const isActive = activeNodes.has(kind);
        const activationKey = activationKeys[kind] || 0;
        // Phase offset for ambient pulse so nodes breathe out of sync
        const phaseDur = 3 + i * 0.7;

        return (
          <g key={kind} transform={`translate(${pos.x}, ${pos.y})`}>
            {/* Outer ambient pulse ring */}
            <circle
              r="26"
              fill="none"
              stroke={color}
              strokeWidth="0.5"
              opacity={isActive ? 0 : 0.12}
              style={{ transition: 'opacity 0.5s ease' }}
            >
              <animate
                attributeName="r"
                values="22;30;22"
                dur={`${phaseDur}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.08;0.2;0.08"
                dur={`${phaseDur}s`}
                repeatCount="indefinite"
              />
            </circle>

            {/* Active burst ring — remounts on each activation to restart animation */}
            {isActive && (
              <circle
                key={`burst-${kind}-${activationKey}`}
                r="20"
                fill="none"
                stroke={color}
                strokeWidth="1.2"
                opacity="0.8"
                filter="url(#brain-bloom)"
              >
                <animate
                  attributeName="r"
                  values="16;36;16"
                  dur="1.4s"
                  repeatCount="2"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.1;0.9"
                  dur="1.4s"
                  repeatCount="2"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
                />
              </circle>
            )}

            {/* Node body ring */}
            <circle
              r="15"
              fill={isActive ? color : '#0d0f12'}
              fillOpacity={isActive ? 0.18 : 1}
              stroke={color}
              strokeWidth={isActive ? 1.5 : 0.7}
              strokeOpacity={isActive ? 1 : 0.35}
              style={{
                transition:
                  'fill-opacity 0.4s ease, stroke-width 0.4s ease, stroke-opacity 0.4s ease',
              }}
            />

            {/* Inner dot */}
            <circle
              r={isActive ? 5.5 : 3}
              fill={color}
              opacity={isActive ? 1 : 0.45}
              filter={isActive ? 'url(#brain-bloom)' : undefined}
              style={{ transition: 'r 0.3s ease, opacity 0.3s ease' }}
            />

            {/* Kind label below node */}
            <text
              y="30"
              textAnchor="middle"
              fill={color}
              opacity={isActive ? 1 : 0.35}
              fontSize="8"
              fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
              fontWeight={isActive ? 'bold' : 'normal'}
              letterSpacing="0.1em"
              style={{ transition: 'opacity 0.4s ease' }}
            >
              {kind.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Center label */}
      <text
        x="150"
        y="145"
        textAnchor="middle"
        fill="#262c34"
        fontSize="9.5"
        fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
        fontWeight="bold"
        letterSpacing="0.2em"
      >
        NEURAL
      </text>
      <text
        x="150"
        y="159"
        textAnchor="middle"
        fill="#262c34"
        fontSize="9.5"
        fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
        fontWeight="bold"
        letterSpacing="0.2em"
      >
        PIPELINE
      </text>
    </svg>
  );
});

// ─── Event Card ────────────────────────────────────────────────────────────────

const EventCard = memo(function EventCard({
  event,
  isNewest,
}: {
  event: BrainEvent;
  isNewest: boolean;
}) {
  const color = KIND_COLORS[event.kind] || '#9aa3ad';
  const icon = KIND_ICONS[event.kind] || '◻';

  return (
    <div
      className={`flex gap-3 px-3 py-2.5 rounded-[2px] border bg-jtp-panel flex-shrink-0 ${
        isNewest ? 'animate-jtp-slide-in' : ''
      }`}
      style={{
        borderColor: '#1b2026',
        borderLeftColor: color,
        borderLeftWidth: '2px',
      }}
    >
      {/* Icon column */}
      <span
        className="flex-shrink-0 mt-0.5 font-mono leading-none text-[13px]"
        style={{ color }}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-mono text-[11.5px] leading-tight text-jtp-textSoft truncate">
            {event.title}
          </p>
          <span className="flex-shrink-0 font-mono text-jtp-2xs text-jtp-textFaint tabular-nums mt-px">
            {timeAgo(event.createdAt)}
          </span>
        </div>

        {/* Detail */}
        {event.detail && (
          <p className="text-[10.5px] text-jtp-textDim leading-relaxed line-clamp-2 mb-1.5">
            {event.detail}
          </p>
        )}

        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center px-1.5 py-[1px] rounded-[2px] font-mono text-[9px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${color}1a`,
              color,
              border: `1px solid ${color}35`,
            }}
          >
            {event.kind}
          </span>
          <span className="inline-flex items-center px-1.5 py-[1px] rounded-[2px] font-mono text-[9px] uppercase tracking-widest bg-jtp-active border border-jtp-borderStrong text-jtp-textDim">
            {event.module}
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── Thought Feed ──────────────────────────────────────────────────────────────

const ThoughtFeed = memo(function ThoughtFeed({
  events,
  newestId,
}: {
  events: BrainEvent[];
  newestId: string | null;
}) {
  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto h-full"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#1b2026 transparent' }}
      role="log"
      aria-live="polite"
      aria-label="Live brain event feed"
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-jtp-textDim">
          <span className="font-mono text-[22px] opacity-20">◎</span>
          <span className="font-mono text-[10px] uppercase tracking-widest">
            Waiting for signals&hellip;
          </span>
        </div>
      ) : (
        events.map(ev => (
          <EventCard key={ev.id} event={ev} isNewest={ev.id === newestId} />
        ))
      )}
    </div>
  );
});

// ─── Scoreboard Tile ───────────────────────────────────────────────────────────

function ScoreTile({
  moduleData,
  learnEvents,
}: {
  moduleData: BrainScoreboardModule;
  learnEvents: BrainEvent[];
}) {
  const wins = learnEvents.filter(e => (e.data as any)?.won === true).length;
  const total = learnEvents.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;
  const pnl = learnEvents.reduce(
    (sum, e) => sum + (((e.data as any)?.pnlUsd as number) || 0),
    0
  );
  const isActive = moduleData.decided > 0 || moduleData.executed > 0;

  return (
    <div className="flex-1 min-w-[160px] bg-jtp-panel border border-jtp-border rounded-[3px] p-4 transition-colors hover:border-jtp-borderStrong">
      {/* Module header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-jtp-amber">
          {moduleData.module}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: isActive ? '#3ddc84' : '#1b2026',
            boxShadow: isActive ? '0 0 5px #3ddc84' : 'none',
            animation: isActive ? 'pulseDot 2s ease-in-out infinite' : 'none',
          }}
          aria-label={isActive ? 'Active module' : 'No recent activity'}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {[
          { label: 'Decided',  value: moduleData.decided,  color: KIND_COLORS.decide  },
          { label: 'Executed', value: moduleData.executed, color: KIND_COLORS.execute },
          { label: 'Learned',  value: moduleData.learned,  color: KIND_COLORS.learn   },
          { label: 'Skipped',  value: moduleData.skipped,  color: KIND_COLORS.skip    },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="font-mono text-[9px] uppercase tracking-wider text-jtp-textDim mb-0.5">
              {label}
            </div>
            <div
              className="font-mono text-[20px] font-bold leading-none tabular-nums"
              style={{ color }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Win rate + P&L */}
      {(winRate !== null || pnl !== 0) && (
        <div className="mt-3 pt-3 border-t border-jtp-borderSubtle flex items-center justify-between gap-3 flex-wrap">
          {winRate !== null && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-jtp-textDim mb-0.5">
                Win rate
              </div>
              <div
                className="font-mono text-[14px] font-bold tabular-nums"
                style={{ color: winRate >= 50 ? '#3ddc84' : '#ff5b52' }}
              >
                {winRate}%
              </div>
            </div>
          )}
          {pnl !== 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-jtp-textDim mb-0.5">
                Realized P&amp;L
              </div>
              <div
                className="font-mono text-[14px] font-bold tabular-nums"
                style={{ color: pnl >= 0 ? '#3ddc84' : '#ff5b52' }}
              >
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main BrainDashboard ───────────────────────────────────────────────────────

export default function BrainDashboard() {
  const { getToken } = useAuth();

  // ── Module filter ──
  const [activeModule, setActiveModule] = useState<ModuleFilter>(() => {
    try {
      const saved = localStorage.getItem('jtp.brainModule') as ModuleFilter;
      return MODULES.includes(saved) ? saved : 'all';
    } catch {
      return 'all';
    }
  });

  // ── Feed state ──
  const [events, setEvents] = useState<BrainEvent[]>([]);
  const [newestId, setNewestId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // ── Scoreboard state ──
  const [scoreboard, setScoreboard] = useState<BrainScoreboard | null>(null);

  // ── Animation state ──
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [activationKeys, setActivationKeys] = useState<Record<string, number>>({});
  const [particles, setParticles] = useState<Particle[]>([]);

  // ── Refs (stable across renders) ──
  const esRef         = useRef<EventSource | null>(null);
  const reconnTimerRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);
  const mountedRef    = useRef(true);

  // ── Scoreboard fetch ──
  const fetchScoreboard = useCallback(async () => {
    try {
      const token = await getToken();
      const base = getApiBase();
      const url = `${base}/api/brain/scoreboard`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && json.data && mountedRef.current) {
        setScoreboard(json.data as BrainScoreboard);
      }
    } catch {
      /* silent — scoreboard is non-critical */
    }
  }, [getToken]);

  // ── Node fire animation ──
  const fireNode = useCallback((kind: string) => {
    if (!PIPELINE_NODES.includes(kind as PipelineNode)) return;
    const node = kind as PipelineNode;

    // Activate glow
    setActiveNodes(prev => new Set([...prev, node]));
    setActivationKeys(prev => ({ ...prev, [node]: (prev[node] || 0) + 1 }));

    // Synapse particle from previous node in pipeline
    const from = prevPipelineNode(node);
    const pid = `p-${++particleIdRef.current}`;
    const color = KIND_COLORS[node] || '#ffffff';
    setParticles(prev => [...prev, { id: pid, from, to: node, color }]);

    // Deactivate node glow after 2.2s
    const glowTimer = window.setTimeout(() => {
      if (mountedRef.current) {
        setActiveNodes(prev => {
          const next = new Set(prev);
          next.delete(node);
          return next;
        });
      }
    }, 2200);

    // Remove particle after animation completes (750ms travel + buffer)
    const particleTimer = window.setTimeout(() => {
      if (mountedRef.current) {
        setParticles(prev => prev.filter(p => p.id !== pid));
      }
    }, 900);

    return () => {
      clearTimeout(glowTimer);
      clearTimeout(particleTimer);
    };
  }, []);

  // ── SSE connection ──
  useEffect(() => {
    mountedRef.current = true;

    let reconnTimer: number | null = null;
    let es: EventSource | null = null;

    const closeEs = () => {
      if (es) {
        es.close();
        es = null;
        esRef.current = null;
      }
    };

    const doConnect = async () => {
      if (!mountedRef.current) return;
      closeEs();

      const token = await getToken();
      if (!token || !mountedRef.current) return;

      // Backfill recent events
      try {
        const base = getApiBase();
        const q = activeModule !== 'all' ? `?module=${encodeURIComponent(activeModule)}` : '';
        const res = await fetch(`${base}/api/brain/events${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && Array.isArray(json.data) && mountedRef.current) {
            setEvents((json.data as BrainEvent[]).slice(0, MAX_FEED_EVENTS));
          }
        }
      } catch {
        /* silent — will still open SSE */
      }

      if (!mountedRef.current) return;

      // Open SSE stream
      const url = brainStreamUrl(token, activeModule !== 'all' ? activeModule : undefined);
      es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (mountedRef.current) setConnected(true);
      };

      es.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data) as BrainEvent;
          setEvents(prev => [event, ...prev].slice(0, MAX_FEED_EVENTS));
          setNewestId(event.id);
          fireNode(event.kind);
          // Lazily refresh scoreboard every ~10 events
          if (Math.random() < 0.1) fetchScoreboard();
        } catch {
          /* ignore parse errors */
        }
      };

      es.onerror = () => {
        if (mountedRef.current) setConnected(false);
        closeEs();
        // Exponential-ish reconnect: 4s
        reconnTimer = window.setTimeout(() => {
          if (mountedRef.current) doConnect();
        }, 4000);
        reconnTimerRef.current = reconnTimer;
      };
    };

    doConnect();
    fetchScoreboard();

    return () => {
      mountedRef.current = false;
      closeEs();
      if (reconnTimer) clearTimeout(reconnTimer);
      if (reconnTimerRef.current) clearTimeout(reconnTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]); // getToken / fetchScoreboard / fireNode are stable

  // ── Module filter handler ──
  const handleModuleChange = (mod: ModuleFilter) => {
    setActiveModule(mod);
    setEvents([]);
    setNewestId(null);
    try { localStorage.setItem('jtp.brainModule', mod); } catch { /* ignore */ }
  };

  // Derive learn events for scoreboard P&L/win stats
  const learnEventsByModule = events.filter(e => e.kind === 'learn');

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col gap-4"
      style={{ minHeight: 'calc(100vh - 140px)' }}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        {/* Title + live indicator */}
        <div className="flex items-center gap-3">
          <h1 className="font-mono font-bold text-jtp-text uppercase tracking-[0.06em] text-[15px] flex items-center gap-2">
            <span style={{ color: '#a855f7', fontSize: '18px' }}>◈</span>
            Brain
          </h1>
          <div className="flex items-center gap-1.5" aria-live="polite">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: connected ? '#3ddc84' : '#ff5b52',
                boxShadow: connected
                  ? '0 0 0 0 #3ddc8440, 0 0 6px #3ddc84'
                  : '0 0 6px #ff5b52',
                animation: connected ? 'pulseDot 2s ease-in-out infinite' : 'none',
              }}
              aria-label={connected ? 'Stream connected' : 'Stream disconnected'}
            />
            <span className="font-mono text-[9.5px] uppercase tracking-widest text-jtp-textDim">
              {connected ? 'LIVE' : 'RECONNECTING'}
            </span>
          </div>
        </div>

        {/* Module filter chips */}
        <div
          className="flex items-center gap-1.5 flex-wrap"
          role="group"
          aria-label="Filter by module"
        >
          {MODULES.map(mod => {
            const isActive = activeModule === mod;
            return (
              <button
                key={mod}
                onClick={() => handleModuleChange(mod)}
                aria-pressed={isActive}
                className="px-3 py-1 rounded-[2px] font-mono text-[9.5px] uppercase tracking-wider border transition-all duration-150 capitalize"
                style={
                  isActive
                    ? {
                        backgroundColor: '#a855f718',
                        borderColor: '#a855f745',
                        color: '#a855f7',
                        boxShadow: '0 0 8px #a855f720',
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: '#1b2026',
                        color: '#69727c',
                      }
                }
              >
                {mod === 'all' ? 'All' : mod}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content: brain + feed ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(280px,420px)_1fr] gap-4">

        {/* Left panel: neural network visualization */}
        <div className="flex flex-col gap-4 min-h-0">
          <div
            className="relative flex-1 min-h-[300px] lg:min-h-[380px] bg-jtp-panel border border-jtp-border rounded-[3px] flex items-center justify-center overflow-hidden"
          >
            {/* Ambient purple radial glow behind the SVG */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(ellipse 65% 65% at 50% 50%, rgba(168,85,247,0.06) 0%, transparent 70%)',
              }}
            />

            {/* Neural network SVG */}
            <div className="w-full h-full max-w-[340px] max-h-[340px] p-6 mx-auto">
              <BrainNetwork
                activeNodes={activeNodes}
                activationKeys={activationKeys}
                particles={particles}
              />
            </div>

            {/* Corner label */}
            <div
              className="absolute top-3 left-3 font-mono text-[9px] uppercase tracking-widest text-jtp-textDim opacity-60"
              aria-hidden="true"
            >
              NEURAL PIPELINE
            </div>

            {/* Event count badge */}
            <div
              className="absolute bottom-3 right-3 font-mono text-[9px] tabular-nums text-jtp-textFaint"
              aria-hidden="true"
            >
              {events.length} events
            </div>
          </div>

          {/* Node legend (desktop) */}
          <div className="hidden lg:grid grid-cols-3 gap-2">
            {PIPELINE_NODES.map(kind => {
              const color = KIND_COLORS[kind];
              const icon = KIND_ICONS[kind];
              const isActive = activeNodes.has(kind);
              return (
                <div
                  key={kind}
                  className="flex items-center gap-2 px-3 py-2 rounded-[2px] bg-jtp-panel border border-jtp-border transition-all duration-300"
                  style={{
                    borderColor: isActive ? `${color}50` : '#1b2026',
                    boxShadow: isActive ? `0 0 8px ${color}25` : 'none',
                  }}
                >
                  <span
                    className="font-mono text-[12px] leading-none"
                    style={{ color: isActive ? color : '#565d66' }}
                  >
                    {icon}
                  </span>
                  <span
                    className="font-mono text-[9.5px] uppercase tracking-wider transition-colors"
                    style={{ color: isActive ? color : '#69727c' }}
                  >
                    {kind}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: live thought feed */}
        <div className="flex flex-col min-h-0 bg-jtp-panel border border-jtp-border rounded-[3px] overflow-hidden">
          {/* Feed header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-jtp-border bg-jtp-raised">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-jtp-textDim">
              Live Thought Feed
            </span>
            <div className="flex items-center gap-3">
              {connected && (
                <span className="flex items-center gap-1 font-mono text-[9px] text-jtp-profit">
                  <span
                    className="w-1 h-1 rounded-full bg-jtp-profit"
                    style={{ animation: 'pulseDot 1.5s ease-in-out infinite' }}
                  />
                  streaming
                </span>
              )}
              <span className="font-mono text-[9.5px] text-jtp-textFaint tabular-nums">
                {events.length} / {MAX_FEED_EVENTS}
              </span>
            </div>
          </div>

          {/* Scrollable events */}
          <div className="flex-1 min-h-0 p-3 min-h-[200px]">
            <ThoughtFeed events={events} newestId={newestId} />
          </div>
        </div>
      </div>

      {/* ── Scoreboard ── */}
      <div className="flex-shrink-0">
        {/* Section header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-jtp-textDim">
            Module Scoreboard
          </span>
          {scoreboard && (
            <span className="font-mono text-[9.5px] text-jtp-textFaint tabular-nums">
              {scoreboard.total} total events
            </span>
          )}
        </div>

        {scoreboard && scoreboard.modules.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {scoreboard.modules.map(mod => (
              <ScoreTile
                key={mod.module}
                moduleData={mod}
                learnEvents={learnEventsByModule.filter(
                  e => e.module === mod.module
                )}
              />
            ))}
          </div>
        ) : (
          <div className="bg-jtp-panel border border-jtp-border rounded-[3px] px-4 py-3 flex items-center gap-2 text-jtp-textDim font-mono text-[10.5px]">
            <span
              style={{
                animation: 'pulseDot 2s ease-in-out infinite',
                opacity: 0.5,
              }}
            >
              ◎
            </span>
            No module activity yet — scoreboard will populate as the brain runs.
          </div>
        )}
      </div>
    </div>
  );
}
