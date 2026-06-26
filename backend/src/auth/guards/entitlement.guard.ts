import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveEntitlement } from '../entitlement';

/**
 * Gates a route on paid (pro) entitlement. MUST run after JwtAccessGuard so
 * req.user.sub is populated, e.g.:
 *
 *   @UseGuards(JwtAccessGuard, EntitlementGuard)
 *
 * Loads the user fresh from the DB (req.user only carries sub/email/role) and
 * applies the single resolveEntitlement() source of truth.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  private readonly logger = new Logger(EntitlementGuard.name);

  // Short cache so we don't read SystemConfig on every gated request.
  private freeModeCache: { value: boolean; at: number } | null = null;
  private readonly FREE_MODE_TTL = 15_000;

  constructor(private readonly prisma: PrismaService) {}

  private async isFreeMode(): Promise<boolean> {
    if (this.freeModeCache && Date.now() - this.freeModeCache.at < this.FREE_MODE_TTL) {
      return this.freeModeCache.value;
    }
    const cfg = await this.prisma.systemConfig.findUnique({
      where: { key: 'main' },
      select: { freeMode: true },
    });
    const value = !!cfg?.freeMode;
    this.freeModeCache = { value, at: Date.now() };
    return value;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;

    if (!userId) {
      // JwtAccessGuard should have populated this; if not, fail closed.
      throw new UnauthorizedException('Authentication required');
    }

    // Free mode: paywall off for everyone (billing system stays intact).
    if (await this.isFreeMode()) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        proAccessExpiresAt: true,
        trialEndsAt: true,
        isLifetimeAccess: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { hasPro } = resolveEntitlement(user);
    if (!hasPro) {
      this.logger.warn(`Entitlement denied for user ${userId} (no active pro access)`);
      throw new ForbiddenException('This feature requires an active subscription.');
    }

    return true;
  }
}
