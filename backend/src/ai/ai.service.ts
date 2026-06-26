import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatgptService } from '../chatgpt/chatgpt.service';
import { QuantService } from '../quant/quant.service';

/**
 * Cross-cutting AI features, all powered by the user's connected ChatGPT/Codex
 * (per the Settings → AI permissions). Each gathers real data, prompts the model,
 * and returns structured JSON.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly chatgpt: ChatgptService,
    private readonly prisma: PrismaService,
    private readonly quant: QuantService,
  ) {}

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
  private readonly AGENT_TOOLS = `
- get_leaderboard {limit?:number}  -> top edge-ranked Polymarket wallets
- scan_wallet {address:string}     -> compute a wallet's edge metrics
- wallet_positions {address:string}-> a wallet's open positions
- quant_stats {}                   -> tracked/scanned/qualified counts
- find_opportunities {}            -> AI-picked copyable edges from the leaderboard
- analyze_my_trades {}             -> review the user's own closed trades`;

  async agent(userId: string, goal: string) {
    if (!(await this.chatgpt.isAllowed(userId, 'analysis'))) {
      throw new BadRequestException('Connect ChatGPT/Codex in Settings → AI and enable Trade analysis.');
    }
    const system =
      `You are JTradePilot's autonomous quant agent. You can use these READ-ONLY tools:${this.AGENT_TOOLS}\n` +
      `Work step by step. To call a tool reply with ONLY JSON: {"tool":"name","args":{...}}. ` +
      `When you have the answer reply with ONLY JSON: {"answer":"...","actions":["optional next steps"]}. ` +
      `Be skeptical of survivorship bias and non-copyable (speed/insider) edges. No markdown.`;
    let transcript = `GOAL: ${goal}`;
    const steps: { tool: string; args: any }[] = [];
    for (let i = 0; i < 6; i++) {
      const out = await this.chatgpt.complete(userId, system, `${transcript}\n\nNext JSON action:`);
      let act: any;
      try {
        act = JSON.parse(out.replace(/```json|```/g, '').trim());
      } catch {
        return { answer: out.slice(0, 1500), steps, raw: true };
      }
      if (act.answer !== undefined) return { answer: act.answer, actions: act.actions, steps };
      if (!act.tool) return { answer: 'No action returned.', steps };
      steps.push({ tool: act.tool, args: act.args || {} });
      const result = await this.runTool(userId, act.tool, act.args || {});
      transcript += `\nTOOL ${act.tool}(${JSON.stringify(act.args || {})}) => ${JSON.stringify(result).slice(0, 1800)}`;
    }
    return { answer: 'Reached the step limit. Refine the goal.', steps };
  }

  private async runTool(userId: string, tool: string, args: any): Promise<any> {
    try {
      switch (tool) {
        case 'get_leaderboard': {
          const ws = await this.quant.leaderboard(Math.min(args.limit || 10, 25));
          return ws.map((w) => ({ wallet: w.pseudonym || w.address.slice(0, 8), addr: w.address, edgeLcb: +w.edgeLcb.toFixed(3), nClosed: w.nClosed, winRate: +(w.winRate).toFixed(2), focus: w.marketFocus }));
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
          return { error: `unknown tool: ${tool}` };
      }
    } catch (e: any) {
      return { error: e?.message || 'tool failed' };
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
