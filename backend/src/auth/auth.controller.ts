import { Controller, Post, Body, Get, Query, Req, Res, UseGuards, Patch, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { Request, Response } from 'express';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ChangeEmailDto } from './dtos/change-email.dto';
import { ResendVerificationDto } from './dtos/resend-verification.dto';
import { Throttle } from '@nestjs/throttler';
import { VerifyEmailDto } from './dtos/verify-email.dto';

// Define a type for Express request objects augmented by Passport
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    refreshToken?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ip = (req as any).ip ?? '';
    // FIX: Cast req to any to access headers
    const userAgent = (req as any).headers['user-agent'] || '';
    await this.authService.register(registerDto, ip, userAgent);
    return { message: 'Registration successful. Please check your email to verify your account.' };
  }
  
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto.token);
    return { message: 'Email verified successfully. You can now log in.' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
      await this.authService.resendVerificationEmail(resendDto.email);
      return { message: 'If an account with that email exists, a new verification link has been sent.' };
  }
  
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = (req as any).ip ?? '';
    // FIX: Cast req to any to access headers
    const userAgent = (req as any).headers['user-agent'] || '';
    const { accessToken, refreshToken, user } = await this.authService.login(loginDto, ip, userAgent);

    // FIX: Cast res to any to access cookie method
    (res as any).cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/auth/refresh',
    });

    return { accessToken, user };
  }
  
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.sub;
    const oldRefreshToken = (req as any).cookies.refresh_token;

    if (!userId || !oldRefreshToken) {
      throw new UnauthorizedException();
    }
    
    const { newAccessToken, newRefreshToken } = await this.authService.rotateRefreshToken(userId, oldRefreshToken);

    // FIX: Cast res to any to access cookie method
    (res as any).cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/auth/refresh',
    });
    
    return { accessToken: newAccessToken };
  }
  
  @UseGuards(JwtAccessGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
      const refreshToken = (req as any).cookies.refresh_token;
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      // FIX: Cast res to any to access clearCookie method
      (res as any).clearCookie('refresh_token', { path: '/auth/refresh' });
      return { message: 'Logged out successfully.' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    return { message: 'Password has been reset successfully.' };
  }

  @UseGuards(JwtAccessGuard)
  @Patch('change-password')
  async changePassword(@Req() req: AuthenticatedRequest, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user.sub;
    await this.authService.changePassword(userId, changePasswordDto);
    return { message: 'Password changed successfully.' };
  }

  @UseGuards(JwtAccessGuard)
  @Patch('change-email')
  async changeEmail(@Req() req: AuthenticatedRequest, @Body() changeEmailDto: ChangeEmailDto) {
    const userId = req.user.sub;
    await this.authService.requestEmailChange(userId, changeEmailDto.newEmail);
    return { message: 'A verification link has been sent to your new email address.' };
  }

  @Post('verify-email-change')
  @HttpCode(HttpStatus.OK)
  async verifyEmailChange(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmailChange(verifyEmailDto.token);
    return { message: 'Email address changed successfully.' };
  }
}
