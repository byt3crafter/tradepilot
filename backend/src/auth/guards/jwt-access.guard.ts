import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  private readonly devLogger = new Logger(JwtAccessGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.tryDevBypass(context)) return true;
    return (await super.canActivate(context)) as boolean;
  }

  /**
   * DEV-ONLY auth bypass. Lets a local developer / headless browser hit the API
   * without a real Clerk JWT. Hard-gated so it can NEVER activate in production:
   *   - NODE_ENV must NOT be 'production'
   *   - DEV_AUTH_BYPASS must be exactly 'true'
   *   - the request must carry the matching DEV_AUTH_TOKEN
   *   - DEV_USER_ID must be set (the real user the request acts as)
   */
  private tryDevBypass(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    if (process.env.DEV_AUTH_BYPASS !== 'true') return false;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization || '';
    const expected = `Bearer ${process.env.DEV_AUTH_TOKEN || 'dev-bypass-token'}`;
    if (auth !== expected) return false;

    const sub = process.env.DEV_USER_ID;
    if (!sub) return false;

    req.user = { sub, email: 'dev@local', role: 'ADMIN' };
    this.devLogger.warn(
      `DEV_AUTH_BYPASS active — request authenticated as ${sub}. NEVER enable in production.`,
    );
    return true;
  }
}
