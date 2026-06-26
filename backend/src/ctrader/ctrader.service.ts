import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * cTrader Open API OAuth 2.0.
 *  - authorize: https://id.ctrader.com/my/settings/openapi/grantingaccess/
 *  - token:     https://openapi.ctrader.com/apps/token  (GET)
 * Credentials live only in env (CTRADER_CLIENT_ID/SECRET). Tokens are stored
 * server-side per user. `state` carries a signed userId so the (unauthenticated)
 * callback can map the code back to the right user.
 */
@Injectable()
export class CtraderService {
  private readonly logger = new Logger(CtraderService.name);
  constructor(private readonly prisma: PrismaService) {}

  private get cfg() {
    return {
      clientId: process.env.CTRADER_CLIENT_ID || '',
      clientSecret: process.env.CTRADER_CLIENT_SECRET || '',
      redirectUri: process.env.CTRADER_REDIRECT_URI || 'https://jtradepilot.com/api/ctrader/callback',
      scope: process.env.CTRADER_SCOPE || 'accounts',
      frontendUrl: process.env.FRONTEND_URL || 'https://jtradepilot.com',
    };
  }

  private signState(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ uid: userId, ts: Date.now() })).toString('base64url');
    const sig = crypto.createHmac('sha256', this.cfg.clientSecret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private verifyState(state: string): string {
    const [payload, sig] = (state || '').split('.');
    if (!payload || !sig) throw new BadRequestException('Invalid state');
    const expected = crypto.createHmac('sha256', this.cfg.clientSecret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new BadRequestException('Bad state signature');
    }
    const { uid, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - ts > 10 * 60 * 1000) throw new BadRequestException('State expired');
    return uid;
  }

  buildAuthUrl(userId: string): string {
    const { clientId, redirectUri, scope } = this.cfg;
    if (!clientId) throw new BadRequestException('cTrader is not configured');
    const p = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      product: 'web',
      state: this.signState(userId),
    });
    return `https://id.ctrader.com/my/settings/openapi/grantingaccess/?${p.toString()}`;
  }

  /** Exchange the auth code for tokens and persist them. Returns a redirect URL. */
  async handleCallback(code: string, state: string): Promise<string> {
    const { clientId, clientSecret, redirectUri, frontendUrl, scope } = this.cfg;
    let userId: string;
    try {
      userId = this.verifyState(state);
    } catch {
      return `${frontendUrl}/?ctrader=error`;
    }
    if (!code) return `${frontendUrl}/?ctrader=error`;

    try {
      const p = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });
      const res = await fetch(`https://openapi.ctrader.com/apps/token?${p.toString()}`);
      const json: any = await res.json();
      if (json?.errorCode || !json?.accessToken) {
        this.logger.error(`ctrader token error: ${json?.errorCode} ${json?.description}`);
        return `${frontendUrl}/?ctrader=error`;
      }
      const expiresAt = new Date(Date.now() + (json.expiresIn ?? 2628000) * 1000);
      await this.prisma.ctraderConnection.upsert({
        where: { userId },
        create: { userId, accessToken: json.accessToken, refreshToken: json.refreshToken ?? '', expiresAt, scope },
        update: { accessToken: json.accessToken, refreshToken: json.refreshToken ?? '', expiresAt, scope },
      });
      this.logger.log(`ctrader connected for user ${userId}`);
      return `${frontendUrl}/?ctrader=connected`;
    } catch (e: any) {
      this.logger.error(`ctrader callback failed: ${e?.message}`);
      return `${frontendUrl}/?ctrader=error`;
    }
  }

  async getStatus(userId: string) {
    const c = await this.prisma.ctraderConnection.findUnique({
      where: { userId },
      select: { expiresAt: true, scope: true, ctidTraderAccountId: true, updatedAt: true },
    });
    return {
      connected: !!c,
      configured: !!this.cfg.clientId,
      ...(c ? { expiresAt: c.expiresAt, scope: c.scope, connectedAt: c.updatedAt } : {}),
    };
  }

  async disconnect(userId: string) {
    await this.prisma.ctraderConnection.deleteMany({ where: { userId } });
    return { disconnected: true };
  }
}
