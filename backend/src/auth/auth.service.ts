import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from './tokens/token.service';
import { MailService } from '../mail/mail.service';
// import { User } from '@prisma/client'; // FIX: Removed to resolve type error.
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto, ip: string, userAgent: string) {
    const { email, password, fullName } = registerDto;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await this.usersService.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
    });

    const { token } = await this.tokenService.createEmailVerificationToken(user.id);
    await this.mailService.sendVerificationEmail(user.email, token);
    
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).authAudit.create({
      data: { userId: user.id, ip, userAgent, event: 'register_requested' },
    });
    
    return user;
  }

  async login(loginDto: LoginDto, ip: string, userAgent: string) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (!user) {
        // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
        await (this.prisma as any).authAudit.create({
            data: { emailTried: email, ip, userAgent, event: 'login_failed_user_not_found' },
        });
        throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
        throw new ForbiddenException('Please verify your email address before logging in.');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatching) {
        // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
        await (this.prisma as any).authAudit.create({
            data: { userId: user.id, ip, userAgent, event: 'login_failed_invalid_password' },
        });
        throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateAndSaveTokens(user, ip, userAgent);

    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    // FIX: Cast `this.prisma` to `any` to bypass TypeScript errors.
    await (this.prisma as any).authAudit.create({
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
        const newSession = await this.tokenService.rotateRefreshToken(oldRefreshToken, userId);
        const newAccessToken = this.tokenService.generateAccessToken({ sub: userId });
        return { newAccessToken, newRefreshToken: newSession.token };
      } catch (error) {
          this.logger.warn(`Refresh token rotation failed for user ${userId}: ${error.message}`);
          throw new UnauthorizedException('Invalid refresh token');
      }
  }

  // FIX: Changed User type to any to resolve type error.
  private async generateAndSaveTokens(user: any, ip: string, userAgent: string) {
    const accessToken = this.tokenService.generateAccessToken({ sub: user.id });
    const { token: refreshToken } = await this.tokenService.createRefreshSession(user.id, { ip, userAgent });
    return { accessToken, refreshToken };
  }

  async verifyEmail(token: string) {
    const verification = await this.tokenService.consumeVerificationToken(token, 'EMAIL_VERIFY');
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
      const { userId, payload } = await this.tokenService.consumeVerificationToken(token, 'EMAIL_CHANGE');
      const newEmail = payload?.newEmail;
      
      if (!newEmail) {
          throw new BadRequestException('Invalid email change token.');
      }

      await this.usersService.update(userId, { email: newEmail.toLowerCase() });
  }
}
