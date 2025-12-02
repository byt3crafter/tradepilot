
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
      issuer: issuer,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
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
