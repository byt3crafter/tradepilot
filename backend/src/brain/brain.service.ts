import { Injectable } from '@nestjs/common';
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
  | 'note';     // freeform status

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

  constructor(private readonly prisma: PrismaService) {}

  /** Fire a neuron — push to the live stream + persist (fire-and-forget). */
  publish(e: BrainEventInput) {
    const evt = { ...e, id: cryptoRandom(), createdAt: new Date().toISOString() };
    this.bus.next(evt);
    this.prisma.brainEvent
      .create({ data: { userId: e.userId, module: e.module, kind: e.kind, title: e.title, detail: e.detail ?? null, data: e.data ?? undefined } })
      .catch(() => {});
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
    const events = await this.prisma.brainEvent.findMany({ where: { userId, createdAt: { gte: since } }, select: { module: true, kind: true } });
    const byModule: Record<string, any> = {};
    for (const e of events) {
      const m = (byModule[e.module] ??= { module: e.module, decided: 0, executed: 0, learned: 0, skipped: 0 });
      if (e.kind === 'decide') m.decided++;
      else if (e.kind === 'execute') m.executed++;
      else if (e.kind === 'learn') m.learned++;
      else if (e.kind === 'skip') m.skipped++;
    }
    return { modules: Object.values(byModule), total: events.length };
  }
}

function cryptoRandom(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').randomUUID();
}
