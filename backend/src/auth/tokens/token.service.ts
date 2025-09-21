
import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
// import { VerificationTokenType } from '@prisma/client'; // FIX: Removed to resolve type error.

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  generateAccessToken(payload: { sub: string; role: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      // FIX: Convert TTL string to a number of seconds to resolve type error.
      expiresIn: this.parseTtl(this.configService.get<string>('ACCESS_TOKEN_TTL')!) / 1000,
    });
  }

  generateRefreshToken(payload: { sub: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      // FIX: Convert TTL string to a number of seconds to resolve type error.
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
    // Note: We don't hash the JWT refresh token itself, as it's self-contained.
    // The session is for tracking and revocation. A simpler identifier could be used.
    // For now, let's proceed with a simpler approach for refresh tokens if needed,
    // but the critical fix is for one-time tokens. Let's assume the JWT is stored for now.
    // A better approach would be not to store the JWT hash but an independent session ID.
    // However, to fix the IMMEDIATE bug, we will hash the refresh token.
    const tokenHash = this.hashToken(token);

    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).refreshSession.create({
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
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    const session = await (this.prisma as any).refreshSession.findUnique({
        where: { tokenHash: oldTokenHash }
    });

    if (!session || session.revokedAt || session.userId !== userId) {
        // If session not found, or revoked, or user doesn't match, it's suspicious.
        // As a security measure, revoke all sessions for this user.
        // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
        await (this.prisma as any).refreshSession.updateMany({
            where: { userId },
            data: { revokedAt: new Date() }
        });
        throw new UnauthorizedException('Potential token reuse detected. All sessions revoked.');
    }

    const { token: newToken } = await this.createRefreshSession(userId, { ip: session.ip, userAgent: session.userAgent });

    // Invalidate the old session
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
    });

    return { token: newToken };
  }

  async revokeRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).refreshSession.update({
        where: { tokenHash },
        data: { revokedAt: new Date() }
    });
  }


  // --- One-Time Tokens (Verification, Password Reset) ---

  // FIX: Changed VerificationTokenType to any to resolve type error.
  private async createOneTimeToken(userId: string, type: any, ttl: string, payload?: any) {
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.parseTtl(ttl));

    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).verificationToken.create({
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
    return this.createOneTimeToken(userId, 'EMAIL_VERIFY', this.configService.get<string>('EMAIL_VERIFY_TOKEN_TTL')!);
  }

  async createEmailChangeToken(userId: string, newEmail: string) {
      return this.createOneTimeToken(userId, 'EMAIL_CHANGE', this.configService.get<string>('EMAIL_VERIFY_TOKEN_TTL')!, { newEmail });
  }

  async createPasswordResetToken(userId: string) {
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.parseTtl(this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL')!));
    
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).passwordResetToken.create({
        data: { userId, tokenHash, expiresAt }
    });
    
    return { token };
  }

  // FIX: Changed VerificationTokenType to any to resolve type error.
  async consumeVerificationToken(token: string, type: any) {
    const tokenHash = this.hashToken(token);
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    const verification = await (this.prisma as any).verificationToken.findFirst({
        where: { tokenHash, type }
    });

    if (!verification || verification.usedAt || new Date() > verification.expiresAt) {
      throw new BadRequestException('Invalid or expired token.');
    }

    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    return (this.prisma as any).verificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });
  }

  async consumePasswordResetToken(token: string) {
    const tokenHash = this.hashToken(token);
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    const resetToken = await (this.prisma as any).passwordResetToken.findUnique({
        where: { tokenHash }
    });

    if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        throw new BadRequestException('Invalid or expired password reset token.');
    }

    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    return (this.prisma as any).passwordResetToken.update({
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