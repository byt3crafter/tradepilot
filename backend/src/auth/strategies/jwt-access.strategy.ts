
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { passportJwtSecret } from 'jwks-rsa';

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, '');

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  private readonly logger = new Logger(JwtAccessStrategy.name);

  /** Origins allowed to mint tokens for this API (Clerk `azp` / `aud`). */
  private readonly allowedParties: string[];
  /** When true, an unknown azp/aud is rejected; otherwise warn-only (default). */
  private readonly enforceAzp: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const issuer = stripTrailingSlash(configService.get<string>('CLERK_ISSUER_URL') ?? '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),
      // Hard issuer validation: the token's `iss` MUST equal our Clerk issuer.
      // (Clerk session tokens set iss to exactly CLERK_ISSUER_URL.) Falsy issuer
      // would disable the check, so we keep it undefined only if env is unset.
      issuer: issuer || undefined,
      algorithms: ['RS256'],
      // Add clock tolerance to handle minor server time differences
      jsonWebTokenOptions: {
        clockTolerance: 30,
        ...(issuer ? { issuer } : {}),
      },
    });

    // Authorized-parties allowlist. Prefer an explicit CLERK_AUTHORIZED_PARTIES
    // (comma-separated origins); fall back to FRONTEND_URL so the real frontend
    // keeps working. Origins are normalized (trailing slashes stripped).
    const partiesRaw =
      configService.get<string>('CLERK_AUTHORIZED_PARTIES') ||
      configService.get<string>('FRONTEND_URL') ||
      '';
    this.allowedParties = partiesRaw
      .split(',')
      .map((p) => stripTrailingSlash(p.trim()))
      .filter(Boolean);

    // Conservative default: warn-only on azp/aud mismatch so a misconfigured
    // allowlist cannot lock out real users. Flip CLERK_ENFORCE_AZP=true to
    // hard-reject once the allowlist is verified against production tokens.
    this.enforceAzp = configService.get<string>('CLERK_ENFORCE_AZP') === 'true';

    this.logger.log(
      `JWT Strategy initialized — JWKS: ${issuer}/.well-known/jwks.json, issuer check: ${
        issuer ? 'ON' : 'OFF (CLERK_ISSUER_URL unset)'
      }, azp/aud allowlist: [${this.allowedParties.join(', ') || 'none'}] (${
        this.enforceAzp ? 'enforced' : 'warn-only'
      })`,
    );
  }

  /** True if a Clerk `azp`/`aud` claim is one of our authorized origins. */
  private isAllowedParty(azp: unknown, aud: unknown): boolean {
    if (this.allowedParties.length === 0) return true; // nothing to check against
    const candidates: string[] = [];
    if (typeof azp === 'string') candidates.push(stripTrailingSlash(azp));
    if (typeof aud === 'string') candidates.push(stripTrailingSlash(aud));
    else if (Array.isArray(aud)) {
      for (const a of aud) if (typeof a === 'string') candidates.push(stripTrailingSlash(a));
    }
    return candidates.some((c) => this.allowedParties.includes(c));
  }

  async validate(payload: any) {
    this.logger.debug(`JWT payload received for sub: ${payload?.sub ?? 'unknown'}`);

    if (!payload || !payload.sub) {
      this.logger.warn('Invalid JWT payload received: missing sub claim');
      throw new UnauthorizedException('Invalid token: missing required claims');
    }

    // Authorized-party check: a token's azp/aud must come from an allowed origin.
    // Only meaningful when the token actually carries one of those claims.
    const hasPartyClaim = payload.azp !== undefined || payload.aud !== undefined;
    if (hasPartyClaim && !this.isAllowedParty(payload.azp, payload.aud)) {
      const detail = `azp=${payload.azp ?? '∅'} aud=${JSON.stringify(payload.aud ?? null)} not in allowlist [${this.allowedParties.join(', ')}]`;
      if (this.enforceAzp) {
        this.logger.warn(`Rejecting token: ${detail}`);
        throw new UnauthorizedException('Token authorized party not allowed');
      }
      // TODO: set CLERK_ENFORCE_AZP=true to hard-reject once the allowlist is
      // confirmed against real production tokens.
      this.logger.warn(`Allowing token despite ${detail} (warn-only; set CLERK_ENFORCE_AZP=true to enforce)`);
    }

    try {
      // "sub" in Clerk token is the User ID
      this.logger.debug(`Calling validateClerkUser for sub: ${payload.sub}`);

      const user = await this.authService.validateClerkUser({
        sub: payload.sub,
        email: payload.email, // Email may be undefined if not in JWT template
        name: payload.name, // Extract name from JWT template
        public_metadata: payload.public_metadata // Pass Clerk's public_metadata (contains role)
      });

      if (!user) {
        this.logger.warn(`User validation failed for sub: ${payload.sub}`);
        throw new UnauthorizedException('User could not be validated');
      }

      // Use role from JWT payload first (most up-to-date), fallback to database role
      const jwtRole = payload.role || payload.public_metadata?.role || user.role;
      const result = { sub: user.id, email: user.email, role: jwtRole };
      this.logger.debug(`JWT validation success for sub: ${user.id}`);

      return result;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
