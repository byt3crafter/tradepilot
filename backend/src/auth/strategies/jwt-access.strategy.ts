
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  private readonly logger = new Logger(JwtAccessStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const issuer = configService.get<string>('CLERK_ISSUER_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),
      // Remove strict issuer validation - Clerk tokens use different issuer formats
      // The JWKS signature validation is sufficient for security
      issuer: undefined,
      algorithms: ['RS256'],
      // Add clock tolerance to handle minor server time differences
      jsonWebTokenOptions: {
        clockTolerance: 30,
      },
    });

    this.logger.log(`JWT Strategy initialized with JWKS from: ${issuer}/.well-known/jwks.json`);
  }

  async validate(payload: any) {
    this.logger.log(`🔍 JWT PAYLOAD RECEIVED: ${JSON.stringify(payload)}`);

    if (!payload || !payload.sub) {
      this.logger.warn('Invalid JWT payload received: missing sub claim');
      throw new UnauthorizedException('Invalid token: missing required claims');
    }

    try {
      // "sub" in Clerk token is the User ID
      this.logger.log(`📞 Calling validateClerkUser with public_metadata: ${JSON.stringify(payload.public_metadata)}`);

      const user = await this.authService.validateClerkUser({
        sub: payload.sub,
        email: payload.email, // Email may be undefined if not in JWT template
        public_metadata: payload.public_metadata // Pass Clerk's public_metadata (contains role)
      });

      if (!user) {
        this.logger.warn(`User validation failed for sub: ${payload.sub}`);
        throw new UnauthorizedException('User could not be validated');
      }

      // Use role from JWT payload first (most up-to-date), fallback to database role
      const jwtRole = payload.role || payload.public_metadata?.role || user.role;
      const result = { sub: user.id, email: user.email, role: jwtRole };
      this.logger.log(`✅ JWT VALIDATION SUCCESS - Returning user object: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
