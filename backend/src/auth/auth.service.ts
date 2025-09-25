import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from './tokens/token.service';
import { MailService } from '../mail/mail.service';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly assetsService: AssetsService,
  ) {}

  async register(registerDto: RegisterDto, ip: string, userAgent: string) {
    const { email, password, fullName } = registerDto;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 15);

    const user = await this.usersService.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      trialEndsAt,
    });

    // Seed default assets for the new user to improve onboarding
    await this.assetsService.seedDefaultAssetsForUser(user.id);

    const { token } = await this.tokenService.createEmailVerificationToken(user.id);
    await this.mailService.sendVerificationEmail(user.email, token);
    
    await this.prisma.authAudit.create({
      data: { userId: user.id, ip, userAgent, event: 'register_requested' },
    });
    
    return user;
  }

  async login(loginDto: LoginDto, ip: string, userAgent: string) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (!user) {
        await this.prisma.authAudit.create({
            data: { emailTried: email, ip, userAgent, event: 'login_failed_user_not_found' },
        });
        throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
        throw new ForbiddenException('Please verify your email address before logging in.');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatching) {
        await this.prisma.authAudit.create({
            data: { userId: user.id, ip, userAgent, event: 'login_failed_invalid_password' },
        });
        throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateAndSaveTokens(user, ip, userAgent);

    await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    await this.prisma.authAudit.create({
        data: { userId: user.id, ip, userAgent, event: 'login_success' },
    });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResult } = user;
    return { accessToken, refreshToken, user: userResult };
  }

  async logout(refreshToken: string) {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }
  
  async rotateRefreshToken(userId: string, oldRefreshToken: string) {
      try {
        const user = await this.usersService.findById(userId);
        const newSession = await this.tokenService.rotateRefreshToken(oldRefreshToken, userId);
        const newAccessToken = this.tokenService.generateAccessToken({ sub: userId, role: user.role });
        return { newAccessToken, newRefreshToken: newSession.token };
      } catch (error) {
          this.logger.warn(`Refresh token rotation failed for user ${userId}: ${error.message}`);
          throw new UnauthorizedException('Invalid refresh token');
      }
  }

  private async generateAndSaveTokens(user: client.User, ip: string, userAgent: string) {
    const accessToken = this.tokenService.generateAccessToken({ sub: user.id, role: user.role });
    const { token: refreshToken } = await this.tokenService.createRefreshSession(user.id, { ip, userAgent });
    return { accessToken, refreshToken };
  }

  async verifyEmail(token: string) {
    const verification = await this.tokenService.consumeVerificationToken(token, client.VerificationTokenType.EMAIL_VERIFY);
    await this.usersService.update(verification.userId, { isEmailVerified: true });
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (user && !user.isEmailVerified) {
        const { token } = await this.tokenService.createEmailVerificationToken(user.id);
        await this.mailService.sendVerificationEmail(user.email, token);
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (user) {
        const { token } = await this.tokenService.createPasswordResetToken(user.id);
        await this.mailService.sendPasswordResetEmail(user.email, token);
    }
    // No error is thrown to prevent email enumeration
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.tokenService.consumePasswordResetToken(token);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(reset.userId, { passwordHash });
  }
  
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;
    const user = await this.usersService.findById(userId);

    const isPasswordMatching = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordMatching) {
        throw new UnauthorizedException('Incorrect current password.');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { passwordHash: newPasswordHash });
  }

  async requestEmailChange(userId: string, newEmail: string) {
    const emailExists = await this.usersService.findByEmail(newEmail.toLowerCase());
    if (emailExists) {
        throw new BadRequestException('Email address already in use.');
    }
    const { token } = await this.tokenService.createEmailChangeToken(userId, newEmail);
    await this.mailService.sendChangeEmailVerification(newEmail, token);
  }
  
  async verifyEmailChange(token: string) {
      const { userId, payload } = await this.tokenService.consumeVerificationToken(token, client.VerificationTokenType.EMAIL_CHANGE);
      const newEmail = (payload as any)?.newEmail;
      
      if (!newEmail) {
          throw new BadRequestException('Invalid email change token.');
      }

      await this.usersService.update(userId, { email: newEmail.toLowerCase() });
  }
}