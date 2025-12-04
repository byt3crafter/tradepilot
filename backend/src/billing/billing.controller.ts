import { Controller, Post, Body, Headers, Req, HttpCode, HttpStatus, Logger, UseGuards, Get, RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SkipThrottle } from '@nestjs/throttler';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly configService: ConfigService
  ) {}

  @UseGuards(JwtAccessGuard)
  @Get('config')
  getConfig() {
    return {
      clientSideToken: this.configService.get<string>('PADDLE_CLIENT_SIDE_TOKEN'),
    };
  }
  
  @UseGuards(JwtAccessGuard)
  @Post('checkout')
  async createCheckoutTransaction(@Req() req: AuthenticatedRequest, @Body() body: { email?: string }) {
    const userId = req.user.sub;
    const email = body?.email; // Optional: email from frontend to ensure correct address
    return this.billingService.createCheckoutTransaction(userId, email);
  }

  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handlePaddleWebhook(
    @Headers('paddle-signature') signature: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    // SECURITY: In production, it's CRITICAL to verify the webhook signature.
    this.logger.log(`✓ Received Paddle webhook: ${body.event_type}`);
    try {
      await this.billingService.handleWebhookEvent(body);
      this.logger.log(`✓ Successfully processed webhook: ${body.event_type}`);
    } catch (err: any) {
      this.logger.error(`✗ Error processing webhook: ${err.message}`);
    }
    return { success: true };
  }
}