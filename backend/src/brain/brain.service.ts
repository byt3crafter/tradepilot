import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, filter } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The Brain — a module-agnostic agentic reasoning + learning bus. Any module (Polymarket Quant,
 * Crypto, Forex, …) publishes the SAME shaped "neuron firing" events here; the live Brain
 * dashboard subscribes via SSE and renders them in real time. Decisions, recalls, executions
 * and post-trade lessons all flow through one stream so the whole product shares one brain.
 */
export type BrainKind =
  | 'tick'      // a thinking cycle started
  | 'research'  // gathered context / reasoned about a candidate
  | 'recall'    // pulled relevant memory (past lessons)
  | 'decide'    // took a position decision (with conviction)
  | 'skip'      // considered + rejected a candidate
  | 'execute'   // placed a real order
  | 'learn'     // a trade resolved → lesson written to memory
  | 'note'      // freeform status
  | 'error'     // something FAILED (always surfaced)
  | 'debug';    // verbose trace (only when verbosity is on)

export type BrainLevel = 'quiet' | 'normal' | 'verbose' | 'debug';

export interface BrainEventInput {
  userId: string;
  module: string; // 'polymarket' | 'crypto' | 'forex' | ...
  kind: BrainKind;
  title: string;
  detail?: string;
  data?: any; // structured payload (edge, conviction, size, pnl, recalled[], ...)
}

@Injectable()
export class BrainService {
  private readonly bus = new Subject<any>();
  private readonly logger = new Logger(BrainService.name);
  /** Verbosity is PER-USER (was a global singleton — N2). Keyed by userId; falls back to default. */
  private readonly levels = new Map<string, BrainLevel>();
  private readonly defaultLevel: BrainLevel = (process.env.BRAIN_LEVEL as BrainLevel) || 'normal';

  constructor(private readonly prisma: PrismaService) {}

  setLevel(userId: string, l: BrainLevel) {
    if (['quiet', 'normal', 'verbose', 'debug'].includes(l)) this.levels.set(userId, l);
    return this.getLevel(userId);
  }
  getLevel(userId: string): BrainLevel { return this.levels.get(userId) ?? this.defaultLevel; }

  /** Always surfaced — a failure in any module. Shows red in the feed + persists for debugging. */
  error(e: { userId: string; module: string; title: string; detail?: string; data?: any }) {
    return this.publish({ ...e, kind: 'error' });
  }

  /** Verbose trace — only emitted when the FIRING USER's verbosity is 'verbose' or 'debug'. Gated per-user (N2). */
  trace(e: { userId: string; module: string; title: string; detail?: string; data?: any }) {
    const level = this.getLevel(e.userId);
    if (level === 'verbose' || level === 'debug') return this.publish({ ...e, kind: 'debug' });
  }

  /** Fire a neuron — push to the live stream + persist (fire-and-forget). */
  publish(e: BrainEventInput) {
    const evt = { ...e, id: cryptoRandom(), createdAt: new Date().toISOString() };
    this.bus.next(evt);
    this.prisma.brainEvent
      .create({ data: { userId: e.userId, module: e.module, kind: e.kind, title: e.title, detail: e.detail ?? null, data: e.data ?? undefined } })
      .catch((err) => this.logger.warn(`brain event persist failed (${e.module}/${e.kind}): ${err?.message ?? err}`));
    return evt;
  }

  /** Live stream for one user (SSE), optionally filtered by module. */
  stream(userId: string, module?: string): Observable<any> {
    return this.bus.asObservable().pipe(filter((e) => e.userId === userId && (!module || e.module === module)));
  }

  recent(userId: string, module?: string, limit = 120) {
    return this.prisma.brainEvent.findMany({
      where: { userId, ...(module ? { module } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 400),
    });
  }

  /** "Is the brain working?" — activity + outcome stats per module. */
  async scoreboard(userId: string) {
    const since = new Date(Date.now() - 7 * 864e5);
    const grouped = await this.prisma.brainEvent.groupBy({
      by: ['module', 'kind'],
      where: { userId, createdAt: { gte: since } },
      _count: { _all: true },
    });
    const byModule: Record<string, any> = {};
    let total = 0;
    for (const g of grouped) {
      const count = g._count._all;
      total += count;
      const m = (byModule[g.module] ??= { module: g.module, decided: 0, executed: 0, learned: 0, skipped: 0 });
      if (g.kind === 'decide') m.decided += count;
      else if (g.kind === 'execute') m.executed += count;
      else if (g.kind === 'learn') m.learned += count;
      else if (g.kind === 'skip') m.skipped += count;
    }
    return { modules: Object.values(byModule), total };
  }
}

function cryptoRandom(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').randomUUID();
}
