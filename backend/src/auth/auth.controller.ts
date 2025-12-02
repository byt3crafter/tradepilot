
import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
      private readonly authService: AuthService,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(@Body() body: any) {
      // Optional: Endpoint for Clerk Webhooks if needed later
      this.logger.log('Auth sync called');
      return { status: 'ok' };
  }
}
