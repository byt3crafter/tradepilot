
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
    const issuerWithSlash = issuer.endsWith('/') ? issuer : `${issuer}/`;
    const issuerWithoutSlash = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;

    Logger.log(`Initializing JwtAccessStrategy with issuer: ${issuer}`, 'JwtAccessStrategy');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuerWithoutSlash}/.well-known/jwks.json`,
        handleSigningKeyError: (err, cb) => {
          Logger.error(`Signing Key Error: ${err.message}`, err.stack, 'JwtAccessStrategy');
          cb(err);
        }
      }),
      issuer: [issuerWithSlash, issuerWithoutSlash], // Allow both formats
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    this.logger.log(`Validating JWT payload: ${JSON.stringify(payload)}`);
    if (!payload || !payload.sub) {
      this.logger.warn('Invalid JWT payload received');
      throw new UnauthorizedException();
    }

    // "sub" in Clerk token is the User ID
    const user = await this.authService.validateClerkUser({
      sub: payload.sub,
      email: payload.email // Ensure your Clerk JWT Template includes 'email'
    });

    if (!user) {
      throw new UnauthorizedException('User could not be validated');
    }

    return { sub: user.id, email: user.email, role: user.role };
  }
}