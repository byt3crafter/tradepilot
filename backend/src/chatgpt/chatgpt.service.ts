import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// OpenAI Codex CLI public OAuth client (PKCE, no secret).
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const AUTH_URL = 'https://auth.openai.com/oauth/authorize';
const TOKEN_URL = 'https://auth.openai.com/oauth/token';
const REDIRECT_URI = 'http://localhost:1455/auth/callback'; // fixed by OpenAI's registration

const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

@Injectable()
export class ChatgptService {
  private readonly logger = new Logger(ChatgptService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Begin the PKCE flow: store verifier/state, return the authorize URL. */
  async start(userId: string): Promise<{ authUrl: string }> {
    const verifier = b64url(crypto.randomBytes(64));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(32));
    await this.prisma.chatgptConnection.upsert({
      where: { userId },
      create: { userId, pendingVerifier: verifier, pendingState: state },
      update: { pendingVerifier: verifier, pendingState: state },
    });
    const params = [
      'response_type=code',
      `client_id=${CLIENT_ID}`,
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      `scope=${encodeURIComponent('openid profile email offline_access')}`,
      `code_challenge=${challenge}`,
      'code_challenge_method=S256',
      `state=${state}`,
      'codex_cli_simplified_flow=true',
      'originator=codex_cli_rs',
    ].join('&');
    return { authUrl: `${AUTH_URL}?${params}` };
  }

  /** Exchange the pasted code (+state) for tokens. */
  async exchange(userId: string, code: string, state: string) {
    const conn = await this.prisma.chatgptConnection.findUnique({ where: { userId } });
    if (!conn?.pendingVerifier) throw new BadRequestException('Start the connection again');
    if (conn.pendingState && state && state !== conn.pendingState) {
      throw new BadRequestException('State mismatch — restart the connection');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: conn.pendingVerifier,
    });
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const t = await res.text();
      this.logger.warn(`chatgpt token ${res.status}: ${t.slice(0, 200)}`);
      throw new BadRequestException('Token exchange failed');
    }
    const tok: any = await res.json();
    const accessToken = tok.access_token || '';
    const accountId = this.accountIdFromJwt(accessToken);
    await this.prisma.chatgptConnection.update({
      where: { userId },
      data: {
        accessToken,
        refreshToken: tok.refresh_token || '',
        accountId,
        expiresAt: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : null,
        pendingVerifier: null,
        pendingState: null,
      },
    });
    return { connected: true };
  }

  private accountIdFromJwt(token: string): string | null {
    try {
      const p = token.split('.')[1];
      if (!p) return null;
      const json = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      return json['https://api.openai.com/auth']?.chatgpt_account_id || null;
    } catch {
      return null;
    }
  }

  private async refresh(userId: string): Promise<string | null> {
    const conn = await this.prisma.chatgptConnection.findUnique({ where: { userId } });
    if (!conn?.refreshToken) return null;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refreshToken,
      client_id: CLIENT_ID,
    });
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return null;
    const tok: any = await res.json();
    const accessToken = tok.access_token || conn.accessToken;
    await this.prisma.chatgptConnection.update({
      where: { userId },
      data: {
        accessToken,
        refreshToken: tok.refresh_token || conn.refreshToken,
        expiresAt: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : conn.expiresAt,
        accountId: this.accountIdFromJwt(accessToken) || conn.accountId,
      },
    });
    return accessToken;
  }

  /** Valid access token (refreshing if near expiry), or null if not connected. */
  async getValidToken(userId: string): Promise<{ token: string; accountId: string | null } | null> {
    const conn = await this.prisma.chatgptConnection.findUnique({ where: { userId } });
    if (!conn?.accessToken) return null;
    if (conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60000) {
      const t = await this.refresh(userId);
      if (t) return { token: t, accountId: conn.accountId };
    }
    return { token: conn.accessToken, accountId: conn.accountId };
  }

  async status(userId: string) {
    const c = await this.prisma.chatgptConnection.findUnique({
      where: { userId },
      select: { accessToken: true, updatedAt: true, model: true, allowVerdict: true, allowBot: true, allowAnalysis: true },
    });
    return {
      connected: !!c?.accessToken,
      connectedAt: c?.updatedAt ?? null,
      model: c?.model ?? null,
      permissions: {
        verdict: c?.allowVerdict ?? true,
        bot: c?.allowBot ?? true,
        analysis: c?.allowAnalysis ?? true,
      },
    };
  }

  /** Set the user-chosen Codex model. */
  async setModel(userId: string, model: string) {
    await this.prisma.chatgptConnection.update({ where: { userId }, data: { model: model || null } });
    return this.status(userId);
  }

  /** Update what the connection is allowed to power. */
  async setPermissions(userId: string, p: { verdict?: boolean; bot?: boolean; analysis?: boolean }) {
    await this.prisma.chatgptConnection.update({
      where: { userId },
      data: {
        ...(p.verdict !== undefined ? { allowVerdict: p.verdict } : {}),
        ...(p.bot !== undefined ? { allowBot: p.bot } : {}),
        ...(p.analysis !== undefined ? { allowAnalysis: p.analysis } : {}),
      },
    });
    return this.status(userId);
  }

  /** Whether a given AI capability is connected AND permitted for this user. */
  async isAllowed(userId: string, cap: 'verdict' | 'bot' | 'analysis'): Promise<boolean> {
    const c = await this.prisma.chatgptConnection.findUnique({ where: { userId } });
    if (!c?.accessToken) return false;
    return cap === 'verdict' ? c.allowVerdict : cap === 'bot' ? c.allowBot : c.allowAnalysis;
  }

  async disconnect(userId: string) {
    await this.prisma.chatgptConnection.deleteMany({ where: { userId } });
    return { disconnected: true };
  }

  /** List models the connected account can use (best-effort, for diagnostics/model picker). */
  async listModels(userId: string) {
    const auth = await this.getValidToken(userId);
    if (!auth) return { models: [], working: ChatgptService.workingModel };
    try {
      const res = await fetch('https://chatgpt.com/backend-api/models', {
        headers: { Authorization: `Bearer ${auth.token}`, ...(auth.accountId ? { 'chatgpt-account-id': auth.accountId } : {}) },
      });
      const j: any = await res.json().catch(() => ({}));
      const arr = j?.models || j?.data || [];
      const models = Array.isArray(arr) ? arr.map((m: any) => m.slug || m.id || m).filter(Boolean) : [];
      this.logger.log(`chatgpt models for ${userId}: ${models.join(', ').slice(0, 300)}`);
      return { models, working: ChatgptService.workingModel };
    } catch (e: any) {
      return { models: [], working: ChatgptService.workingModel, error: e?.message };
    }
  }

  /**
   * One-shot completion via the Codex responses endpoint using the user's token.
   * Returns the accumulated output text. (Undocumented internal endpoint — may
   * need iteration.)
   */
  // Codex+ChatGPT only accepts its codex models. Try the configured one first,
  // then known codex models, skipping any the account reports as unsupported.
  private static workingModel: string | null = null;
  private modelCandidates(): string[] {
    const env = process.env.CODEX_MODEL ? [process.env.CODEX_MODEL] : [];
    const known = ['gpt-5.3-codex', 'gpt-5-codex', 'gpt-5.1-codex', 'gpt-5-codex-mini', 'codex-mini-latest'];
    const list = [...env];
    if (ChatgptService.workingModel) list.unshift(ChatgptService.workingModel);
    for (const m of known) if (!list.includes(m)) list.push(m);
    return list;
  }

  async complete(userId: string, instructions: string, input: string): Promise<string> {
    const auth = await this.getValidToken(userId);
    if (!auth) throw new BadRequestException('CHATGPT_NOT_CONNECTED');
    const conn = await this.prisma.chatgptConnection.findUnique({ where: { userId }, select: { model: true } });
    // If the user picked a model, use exactly that; otherwise try known candidates.
    const candidates = conn?.model ? [conn.model] : this.modelCandidates();
    let res: Response | null = null;
    let lastErr = '';
    for (const model of candidates) {
      res = await fetch('https://chatgpt.com/backend-api/codex/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          ...(auth.accountId ? { 'chatgpt-account-id': auth.accountId } : {}),
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'responses=experimental',
        },
        body: JSON.stringify({ model, instructions, input, stream: true, store: false }),
      });
      if (res.ok && res.body) {
        ChatgptService.workingModel = model; // remember the one that works
        break;
      }
      lastErr = await res.text().catch(() => '');
      this.logger.warn(`codex responses ${res.status} (model ${model}): ${lastErr.slice(0, 160)}`);
      // only fall through to the next model on a "model not supported" 400
      if (!/model.*not supported|unsupported model|invalid model/i.test(lastErr)) break;
      res = null;
    }
    if (!res || !res.ok || !res.body) {
      throw new BadRequestException(`AI request failed${lastErr ? ': ' + lastErr.slice(0, 120) : ''}`);
    }
    // Parse the SSE stream: accumulate output_text deltas.
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let out = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        const payload = s.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (typeof evt.delta === 'string' && /output_text|text\.delta/.test(evt.type || '')) out += evt.delta;
          else if (evt.type === 'response.completed' && evt.response?.output_text) out = evt.response.output_text;
          else if (typeof evt.text === 'string' && evt.type?.includes('output_text.done')) out = out || evt.text;
        } catch { /* skip non-JSON */ }
      }
    }
    return out.trim();
  }
}
