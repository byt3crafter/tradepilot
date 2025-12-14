import { Controller, Post, Body, Headers, Req, HttpCode, HttpStatus, Logger, UseGuards, Get, RawBodyRequest, InternalServerErrorException } from '@nestjs/common';
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

  @Get('plans')
  getPlans() {
    return this.billingService.getPricingPlans();
  }

  @Get('status')
  getSystemStatus() {
    return this.billingService.getSystemStatus();
  }

  @UseGuards(JwtAccessGuard)
  @Post('checkout')
  async createCheckoutSession(
    @Req() req: AuthenticatedRequest,
    @Body('promoCode') promoCode?: string,
    @Body('priceId') priceId?: string,
    @Body('customerEmail') customerEmail?: string
  ) {
    const userId = req.user.sub;
    // Prefer explicitly provided email from frontend (Clerk SDK data), fallback to JWT email
    const email = customerEmail || (req.user as any).email;

    this.logger.log(`Creating checkout for ${userId}. Using email: ${email}`);

    return this.billingService.createCheckoutTransaction(userId, email, promoCode, priceId);
  }

  @UseGuards(JwtAccessGuard)
  @Post('sync')
  async syncSubscription(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Manual subscription sync requested for user ${userId}`);
    return this.billingService.syncSubscription(userId);
  }

  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handlePaddleWebhook(
    @Headers('paddle-signature') signature: string,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body for webhook verification');
      // If rawBody is missing, it might be because the middleware didn't run or payload is empty.
      // We can't verify signature without it.
      throw new InternalServerErrorException('Webhook processing failed: No body');
    }

    try {
      // Verify signature and parse event
      const event = await this.billingService.unmarshalWebhook(rawBody.toString(), signature);

      if (event) {
        this.logger.log(`✓ Verified Paddle webhook: ${event.eventType}`);
        await this.billingService.handleWebhookEvent(event);
        this.logger.log(`✓ Successfully processed webhook: ${event.eventType}`);
      }
    } catch (err: any) {
      this.logger.error(`✗ Error processing webhook: ${err.message}`);
      // We return 200 OK even on error to prevent Paddle from retrying indefinitely if it's a logic error
      // In a real scenario, you might want to return 500 for temporary errors.
    }
    return { success: true };
  }
}