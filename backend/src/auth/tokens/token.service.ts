import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
// FIX: Standardized to named imports to resolve type errors.
import { VerificationTokenType } from '@prisma/client';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  generateAccessToken(payload: { sub: string; role: string }): string {
    // FIX: Provide expiresIn as a number of seconds to fix type issue.
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.parseTtl(this.configService.get<string>('ACCESS_TOKEN_TTL')!) / 1000,
    });
  }

  generateRefreshToken(payload: { sub: string }): string {
    // FIX: Provide expiresIn as a number of seconds to fix type issue.
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.parseTtl(this.configService.get<string>('REFRESH_TOKEN_TTL')!) / 1000,
    });
  }

  private hashToken(token: string): string {
      return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateSecureToken(length = 48): string {
      return crypto.randomBytes(length).toString('hex');
  }

  // --- Refresh Tokens ---

  async createRefreshSession(userId: string, context: { ip?: string; userAgent?: string }) {
    const token = this.generateRefreshToken({ sub: userId });
    const tokenHash = this.hashToken(token);

    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });

    return { token };
  }

  async rotateRefreshToken(oldToken: string, userId: string) {
    const oldTokenHash = this.hashToken(oldToken);
    const session = await this.prisma.refreshSession.findUnique({
        where: { tokenHash: oldTokenHash }
    });

    if (!session || session.revokedAt || session.userId !== userId) {
        await this.prisma.refreshSession.updateMany({
            where: { userId },
            data: { revokedAt: new Date() }
        });
        throw new UnauthorizedException('Potential token reuse detected. All sessions revoked.');
    }

    const { token: newToken } = await this.createRefreshSession(userId, { ip: session.ip ?? undefined, userAgent: session.userAgent ?? undefined });

    await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
    });

    return { token: newToken };
  }

  async revokeRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);
    await this.prisma.refreshSession.update({
        where: { tokenHash },
        data: { revokedAt: new Date() }
    });
  }


  // --- One-Time Tokens (Verification, Password Reset) ---

  private async createOneTimeToken(userId: string, type: VerificationTokenType, ttl: string, payload?: any) {
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.parseTtl(ttl));

    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash,
        type,
        expiresAt,
        payload: payload || undefined,
      },
    });

    return { token };
  }
  
  async createEmailVerificationToken(userId: string) {
    return this.createOneTimeToken(userId, VerificationTokenType.EMAIL_VERIFY, this.configService.get<string>('EMAIL_VERIFY_TOKEN_TTL')!);
  }

  async createEmailChangeToken(userId: string, newEmail: string) {
      return this.createOneTimeToken(userId, VerificationTokenType.EMAIL_CHANGE, this.configService.get<string>('EMAIL_VERIFY_TOKEN_TTL')!, { newEmail });
  }

  async createPasswordResetToken(userId: string) {
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.parseTtl(this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL')!));
    
    await this.prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt }
    });
    
    return { token };
  }

  async consumeVerificationToken(token: string, type: VerificationTokenType) {
    const tokenHash = this.hashToken(token);
    const verification = await this.prisma.verificationToken.findFirst({
        where: { tokenHash, type }
    });

    if (!verification || verification.usedAt || new Date() > verification.expiresAt) {
      throw new BadRequestException('Invalid or expired token.');
    }

    return this.prisma.verificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });
  }

  async consumePasswordResetToken(token: string) {
    const tokenHash = this.hashToken(token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { tokenHash }
    });

    if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        throw new BadRequestException('Invalid or expired password reset token.');
    }

    return this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
    });
  }


  private parseTtl(ttl: string): number {
    const unit = ttl.slice(-1);
    const value = parseInt(ttl.slice(0, -1), 10);
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new InternalServerErrorException('Invalid TTL format');
    }
  }
}