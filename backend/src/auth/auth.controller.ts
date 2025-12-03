
import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from './guards/jwt-access.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(@Body() body: any) {
    // Optional: Endpoint for Clerk Webhooks if needed later
    this.logger.log('Auth sync called');
    return { status: 'ok' };
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  getMe(@Req() req) {
    return req.user;
  }
}
