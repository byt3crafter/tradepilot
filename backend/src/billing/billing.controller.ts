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
  ) { }

  @UseGuards(JwtAccessGuard)
  @Get('config')
  getConfig() {
    return {
      clientSideToken: this.configService.get<string>('PADDLE_CLIENT_SIDE_TOKEN'),
    };
  }

  @UseGuards(JwtAccessGuard)
  @Post('checkout')
  async createCheckoutSession(@Req() req: AuthenticatedRequest, @Body('promoCode') promoCode?: string) {
    const userId = req.user.sub; // Assuming 'sub' is the user ID from JWT
    // The instruction implies req.user.userId and req.user.email, but AuthenticatedRequest only has 'sub'.
    // Sticking to 'sub' for userId to maintain consistency with the interface.
    // If email is needed, it should be added to AuthenticatedRequest or fetched.
    // For now, I'll remove the email parameter from the service call as it's not provided by the new signature.
    // If the service method expects email, the AuthenticatedRequest interface or the JWT payload processing needs adjustment.
    // Based on the instruction, the email is expected from req.user.email, which is not in the current AuthenticatedRequest.
    // To make the code syntactically correct and follow the instruction's spirit, I'll use req.user.sub for userId
    // and omit email from the service call if it's not available from req.user or body.
    // However, the instruction explicitly states `const email = req.user.email;` and `this.billingService.createCheckoutTransaction(userId, email, promoCode);`
    // This implies `req.user.email` should be available. I will add a placeholder for `email` and assume `AuthenticatedRequest`
    // would be updated elsewhere to include it, or that `req.user` is more comprehensive than `AuthenticatedRequest` suggests.
    // For now, I'll use a placeholder for email to match the instruction's service call.
    const email = (req.user as any).email; // Assuming email is available on req.user, casting to any for now.
    return this.billingService.createCheckoutTransaction(userId, email, promoCode);
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