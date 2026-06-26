import { Injectable, BadRequestException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ChatgptService } from '../chatgpt/chatgpt.service';
import { QuantService } from '../quant/quant.service';

// Built-in read-only tools seeded into the registry.
const BUILTIN_TOOLS = [
  { key: 'get_leaderboard', name: 'Get Leaderboard', description: 'Top edge-ranked Polymarket wallets {limit?}', category: 'quant' },
  { key: 'scan_wallet', name: 'Scan Wallet', description: "Compute a wallet's edge metrics {address}", category: 'quant' },
  { key: 'wallet_positions', name: 'Wallet Positions', description: "A wallet's open positions {address}", category: 'quant' },
  { key: 'quant_stats', name: 'Quant Stats', description: 'Tracked/scanned/qualified counts {}', category: 'quant' },
  { key: 'find_opportunities', name: 'Find Opportunities', description: 'AI-picked copyable edges {}', category: 'ai' },
  { key: 'analyze_my_trades', name: 'Analyze My Trades', description: "Review the user's closed trades {}", category: 'journal' },
];

/**
 * Cross-cutting AI features, all powered by the user's connected ChatGPT/Codex
 * (per the Settings → AI permissions). Each gathers real data, prompts the model,
 * and returns structured JSON.
 */
@Injectable()
export class AiService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiService.name);
  constructor(
    private readonly chatgpt: ChatgptService,
    private readonly prisma: PrismaService,
    private readonly quant: QuantService,
  ) {}

  async onApplicationBootstrap() {
    for (const t of BUILTIN_TOOLS) {
      await this.prisma.agentTool.upsert({
        where: { key: t.key },
        create: { ...t, builtin: true, enabled: true, kind: 'builtin' },
        update: { name: t.name, description: t.description, category: t.category, builtin: true },
      });
    }
  }

  // ── Tool registry management ────────────────────────────────────────────────
  listTools() {
    return this.prisma.agentTool.findMany({ orderBy: [{ builtin: 'desc' }, { createdAt: 'asc' }] });
  }
  async addTool(input: { name: string; description: string; method?: string; url: string; category?: string }) {
    if (!/^https:\/\//i.test(input.url || '')) throw new BadRequestException('Skill URL must be https://');
    if (this.isPrivateHost(input.url)) throw new BadRequestException('URL host not allowed');
    const key = (input.name || 'skill').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `skill_${Date.now()}`;
    return this.prisma.agentTool.create({
      data: {
        key, name: input.name, description: input.description, category: input.category || 'custom',
        builtin: false, enabled: true, kind: 'http', httpMethod: (input.method || 'GET').toUpperCase(), httpUrl: input.url,
      },
    });
  }
  async toggleTool(id: string, enabled: boolean) {
    return this.prisma.agentTool.update({ where: { id }, data: { enabled } });
  }
  async deleteTool(id: string) {
    const t = await this.prisma.agentTool.findUnique({ where: { id } });
    if (t?.builtin) throw new BadRequestException('Built-in tools cannot be deleted (disable instead).');
    await this.prisma.agentTool.delete({ where: { id } });
    return { deleted: true };
  }
  listRuns(userId: string) {
    return this.prisma.agentRun.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  getRun(userId: string, id: string) {
    return this.prisma.agentRun.findFirst({ where: { id, userId } });
  }

  // ── Scheduled autonomous agents ─────────────────────────────────────────────
  private freqToMs(f: string): number {
    return ({ '15m': 15 * 60000, hourly: 3600000, '6h': 6 * 3600000, daily: 86400000 } as Record<string, number>)[f] || 86400000;
  }
  listSchedules(userId: string) {
    return this.prisma.scheduledAgent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  createSchedule(userId: string, input: { name: string; goal: string; frequency?: string }) {
    const frequency = ['15m', 'hourly', '6h', 'daily'].includes(input.frequency || '') ? input.frequency! : 'daily';
    return this.prisma.scheduledAgent.create({
      data: { userId, name: input.name || 'Agent', goal: input.goal, frequency, nextRunAt: new Date(Date.now() + this.freqToMs(frequency)) },
    });
  }
  async updateSchedule(userId: string, id: string, data: { name?: string; goal?: string; frequency?: string; enabled?: boolean }) {
    const s = await this.prisma.scheduledAgent.findFirst({ where: { id, userId } });
    if (!s) throw new BadRequestException('Not found');
    return this.prisma.scheduledAgent.update({ where: { id }, data });
  }
  async deleteSchedule(userId: string, id: string) {
    await this.prisma.scheduledAgent.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }
  /** Run a schedule immediately (manual trigger). */
  async runScheduleNow(userId: string, id: string) {
    const s = await this.prisma.scheduledAgent.findFirst({ where: { id, userId } });
    if (!s) throw new BadRequestException('Not found');
    return this.executeSchedule(s);
  }

  private async executeSchedule(s: { id: string; userId: string; name: string; goal: string; frequency: string }) {
    const next = new Date(Date.now() + this.freqToMs(s.frequency));
    try {
      const result = await this.agent(s.userId, s.goal);
      const last = await this.prisma.agentRun.findFirst({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
      await this.prisma.scheduledAgent.update({ where: { id: s.id }, data: { lastRunAt: new Date(), lastRunId: last?.id, nextRunAt: next } });
      await this.prisma.notification.create({ data: { userId: s.userId, message: `🤖 ${s.name}: ${(result.answer || 'done').slice(0, 200)}` } });
      return result;
    } catch (e: any) {
      await this.prisma.scheduledAgent.update({ where: { id: s.id }, data: { lastRunAt: new Date(), nextRunAt: next } });
      this.logger.warn(`scheduled agent ${s.id} failed: ${e?.message}`);
      return { answer: e?.message || 'failed', steps: [], status: 'error' };
    }
  }

  @Interval('agent-scheduler', 5 * 60 * 1000)
  async pollSchedules() {
    const due = await this.prisma.scheduledAgent.findMany({
      where: { enabled: true, nextRunAt: { lte: new Date() } },
      orderBy: { nextRunAt: 'asc' },
      take: 8,
    });
    for (const s of due) await this.executeSchedule(s);
  }

  private isPrivateHost(url: string): boolean {
    try {
      const h = new URL(url).hostname;
      return /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i.test(h) || h.endsWith('jtradepilot.com');
    } catch {
      return true;
    }
  }

  private async runJson(userId: string, cap: 'verdict' | 'bot' | 'analysis', instructions: string, input: string) {
    if (!(await this.chatgpt.isAllowed(userId, cap))) {
      throw new BadRequestException('Connect ChatGPT/Codex in Settings → AI and enable this capability.');
    }
    const text = await this.chatgpt.complete(userId, instructions, input);
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return { raw: text };
    }
  }

  /** Scan the qualified leaderboard → best COPYABLE opportunities + what to do. */
  async opportunities(userId: string) {
    const wallets = await this.quant.leaderboard(25);
    if (!wallets.length) return { opportunities: [], note: 'No qualified wallets yet.' };
    const data = wallets
      .map((w) =>
        `${w.pseudonym || w.address.slice(0, 10)} | edgeLcb=${w.edgeLcb.toFixed(3)} mean=${w.meanEdge.toFixed(3)} ` +
        `n=${w.nClosed}/${w.nEff.toFixed(0)} win=${(w.winRate * 100).toFixed(0)}% $edge=${w.dollarEdge.toFixed(3)} focus=${w.marketFocus} addr=${w.address}`,
      )
      .join('\n');
    const instr =
      'You are a Polymarket quant. From these edge-vetted wallets, pick the best COPYABLE opportunities — ' +
      'replicable mispricing edges on slow markets. EXCLUDE non-copyable signals (speed/HFT, insider, ' +
      'suspicious 100%-win/low-n flukes). Return STRICT JSON only: ' +
      '{"opportunities":[{"wallet","addr","focus","edge","copyable":true|false,"action","why"}]} — max 6, ranked best first.';
    return this.runJson(userId, 'verdict', instr, data);
  }

  /** Review the user's own closed trades → strengths, mistakes, lessons. */
  async journalAnalysis(userId: string) {
    const trades = await this.prisma.trade.findMany({
      where: { userId, result: { not: null } as any },
      orderBy: { exitDate: 'desc' },
      take: 200,
      select: {
        asset: true, direction: true, result: true, realisedR: true, profitLoss: true,
        riskPercentage: true, mistakes: { select: { tag: { select: { label: true } } } },
      },
    });
    if (!trades.length) return { note: 'No closed trades to analyze yet.' };
    const wins = trades.filter((t) => (t.realisedR ?? 0) > 0).length;
    const avgR = trades.reduce((s, t) => s + (t.realisedR ?? 0), 0) / trades.length;
    const mistakeCounts: Record<string, number> = {};
    for (const t of trades) for (const m of t.mistakes) mistakeCounts[m.tag.label] = (mistakeCounts[m.tag.label] || 0) + 1;
    const recent = trades.slice(0, 40)
      .map((t) => `${t.asset} ${t.direction} R=${(t.realisedR ?? 0).toFixed(2)} ${t.result}${t.mistakes.length ? ' mistakes=' + t.mistakes.map((m) => m.tag.label).join('/') : ''}`)
      .join('\n');
    const input =
      `Trades=${trades.length}, winRate=${((wins / trades.length) * 100).toFixed(0)}%, avgR=${avgR.toFixed(2)}.\n` +
      `Mistake tags: ${Object.entries(mistakeCounts).map(([k, v]) => `${k}×${v}`).join(', ') || 'none'}\n` +
      `Recent:\n${recent}`;
    const instr =
      'You are a trading coach. Review this trader\'s closed trades. Be specific and actionable. ' +
      'Return STRICT JSON only: {"strengths":["..."],"mistakes":["..."],"lessons":["..."],"summary":"one paragraph"}.';
    return this.runJson(userId, 'analysis', instr, input);
  }

  /** Synthesize a concrete, backtestable strategy from the copyable edges. */
  async strategy(userId: string) {
    const wallets = await this.quant.leaderboard(15);
    const data = wallets
      .map((w) => `${w.marketFocus} | edgeLcb=${w.edgeLcb.toFixed(3)} win=${(w.winRate * 100).toFixed(0)}% n=${w.nClosed}`)
      .join('\n');
    const instr =
      'You are a quant strategist. From these edge-vetted Polymarket wallets, synthesize ONE concrete, ' +
      'backtestable strategy that targets a REPLICABLE mispricing edge (not speed/insider). ' +
      'Return STRICT JSON only: {"name","marketType","entryRules":["..."],"exitRules":["..."],"riskRules":["..."],"rationale","confidence":"low|medium|high"}.';
    return this.runJson(userId, 'bot', instr, data || 'No data');
  }

  /**
   * Autonomous agent loop (P1, read-only tools). The model replies with a JSON
   * action {tool,args} or {answer}; we execute the tool, feed the result back,
   * and loop. Works over the plain text connection (no native function-calling
   * dependency). Tools are read-only — no trading/writes.
   */
  async agent(userId: string, goal: string) {
    if (!(await this.chatgpt.isAllowed(userId, 'analysis'))) {
      throw new BadRequestException('Connect ChatGPT/Codex in Settings → AI and enable Trade analysis.');
    }
    const tools = await this.prisma.agentTool.findMany({ where: { enabled: true } });
    const toolDesc = tools.map((t) => `- ${t.key} {args} -> ${t.description}`).join('\n');
    const system =
      `You are JTradePilot's autonomous quant agent. READ-ONLY tools available:\n${toolDesc}\n` +
      `Work step by step. To call a tool reply with ONLY JSON: {"tool":"key","args":{...}}. ` +
      `When done reply with ONLY JSON: {"answer":"...","actions":["optional next steps"]}. ` +
      `Be skeptical of survivorship bias and non-copyable (speed/insider) edges. No markdown.`;

    const started = Date.now();
    let transcript = `GOAL: ${goal}`;
    const steps: any[] = [];
    let answer = '';
    let status = 'done';
    try {
      for (let i = 0; i < 6; i++) {
        const out = await this.chatgpt.complete(userId, system, `${transcript}\n\nNext JSON action:`);
        let act: any;
        try {
          act = JSON.parse(out.replace(/```json|```/g, '').trim());
        } catch {
          answer = out.slice(0, 1500);
          break;
        }
        if (act.answer !== undefined) { answer = act.answer; break; }
        if (!act.tool) { answer = 'No action returned.'; break; }
        const tool = tools.find((t) => t.key === act.tool);
        const result = tool ? await this.runTool(userId, tool, act.args || {}) : { error: `unknown or disabled tool: ${act.tool}` };
        steps.push({ tool: act.tool, args: act.args || {}, result: JSON.stringify(result).slice(0, 1200), ts: Date.now() });
        transcript += `\nTOOL ${act.tool}(${JSON.stringify(act.args || {})}) => ${JSON.stringify(result).slice(0, 1800)}`;
        if (i === 5) { status = 'limit'; answer = answer || 'Reached the step limit. Refine the goal.'; }
      }
    } catch (e: any) {
      status = 'error';
      answer = e?.message || 'agent failed';
    }
    await this.prisma.agentRun.create({
      data: { userId, goal, answer, status, steps, durationMs: Date.now() - started },
    }).catch(() => {});
    return { answer, steps, status };
  }

  /** Execute a registry tool (built-in switch, or an installed HTTP skill). */
  private async runTool(userId: string, tool: { key: string; kind: string; httpMethod?: string | null; httpUrl?: string | null }, args: any): Promise<any> {
    try {
      if (tool.kind === 'http') return this.runHttpTool(tool, args);
      switch (tool.key) {
        case 'get_leaderboard': {
          const ws = await this.quant.leaderboard(Math.min(args.limit || 10, 25));
          return ws.map((w) => ({ wallet: w.pseudonym || w.address.slice(0, 8), addr: w.address, edgeLcb: +w.edgeLcb.toFixed(3), nClosed: w.nClosed, winRate: +w.winRate.toFixed(2), focus: w.marketFocus }));
        }
        case 'scan_wallet': {
          const w = await this.quant.scanWallet(args.address);
          return { addr: w.address, edgeLcb: +w.edgeLcb.toFixed(3), meanEdge: +w.meanEdge.toFixed(3), nClosed: w.nClosed, nEff: +w.nEff.toFixed(0), winRate: +w.winRate.toFixed(2), dollarEdge: +w.dollarEdge.toFixed(3), focus: w.marketFocus, qualified: w.qualified };
        }
        case 'wallet_positions':
          return (await this.quant.walletPositions(args.address)).slice(0, 15);
        case 'quant_stats':
          return this.quant.stats();
        case 'find_opportunities':
          return this.opportunities(userId);
        case 'analyze_my_trades':
          return this.journalAnalysis(userId);
        default:
          return { error: `unknown tool: ${tool.key}` };
      }
    } catch (e: any) {
      return { error: e?.message || 'tool failed' };
    }
  }

  private async runHttpTool(tool: { httpMethod?: string | null; httpUrl?: string | null }, args: any): Promise<any> {
    const url = tool.httpUrl || '';
    if (!/^https:\/\//i.test(url) || this.isPrivateHost(url)) return { error: 'skill URL not allowed' };
    try {
      const method = (tool.httpMethod || 'GET').toUpperCase();
      const u = new URL(url);
      let res: Response;
      if (method === 'GET') {
        for (const [k, v] of Object.entries(args || {})) u.searchParams.set(k, String(v));
        res = await fetch(u.toString(), { method, headers: { 'User-Agent': 'JTradePilot-Agent/1.0' } });
      } else {
        res = await fetch(u.toString(), { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'JTradePilot-Agent/1.0' }, body: JSON.stringify(args || {}) });
      }
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { status: res.status, body: text.slice(0, 1000) }; }
    } catch (e: any) {
      return { error: e?.message || 'skill request failed' };
    }
  }

  /** Copilot chat grounded in the user's quant context. */
  async chat(userId: string, message: string, history?: string) {
    if (!(await this.chatgpt.isAllowed(userId, 'analysis'))) {
      throw new BadRequestException('Connect ChatGPT/Codex in Settings → AI and enable Trade analysis.');
    }
    const top = await this.quant.leaderboard(8);
    const ctx = top.map((w) => `${w.pseudonym || w.address.slice(0, 8)} edge=${w.edgeLcb.toFixed(2)} ${w.marketFocus}`).join('; ');
    const instr =
      'You are JTradePilot\'s quant copilot. Answer concisely and honestly using the context when relevant. ' +
      'Be skeptical of survivorship bias and non-copyable edges. Plain text, no markdown.';
    const input = `Context (top edge wallets): ${ctx}\n${history ? history + '\n' : ''}User: ${message}`;
    const reply = await this.chatgpt.complete(userId, instr, input);
    return { reply };
  }
}
