import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Paddle, Environment, PaddleOptions } from '@paddle/paddle-node-sdk';

// Define locally as it seems missing from the generated client export or conflicting
enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private paddle: Paddle;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('PADDLE_API_KEY');
    const paddleEnv = (this.configService.get<string>('PADDLE_ENV') || 'production').toLowerCase();
    const priceId = this.configService.get<string>('PADDLE_PRICE_ID');
    const clientToken = this.configService.get<string>('PADDLE_CLIENT_SIDE_TOKEN');
    const webhookSecret = this.configService.get<string>('PADDLE_WEBHOOK_SECRET_KEY');

    // Log all config on startup for debugging
    this.logger.log(`[Config] PADDLE_ENV: ${paddleEnv}`);
    this.logger.log(`[Config] PADDLE_API_KEY: ${apiKey ? '✓ Set' : '✗ MISSING'}`);
    this.logger.log(`[Config] PADDLE_PRICE_ID: ${priceId ? '✓ Set' : '✗ MISSING'}`);
    this.logger.log(`[Config] PADDLE_CLIENT_SIDE_TOKEN: ${clientToken ? '✓ Set' : '✗ MISSING'}`);
    this.logger.log(`[Config] PADDLE_WEBHOOK_SECRET_KEY: ${webhookSecret ? '✓ Set' : '✗ MISSING'}`);

    if (!apiKey) {
      this.logger.error('PADDLE_API_KEY is missing. Set it in your environment.');
      throw new Error('Missing PADDLE_API_KEY');
    }

    const options: PaddleOptions = {
      environment: paddleEnv === 'sandbox' ? Environment.sandbox : Environment.production,
      // timeout: 15000, // optional
    };

    this.paddle = new Paddle(apiKey, options);
    this.logger.log(`✓ Paddle SDK initialized in "${paddleEnv}" mode.`);
  }

  async createCheckoutTransaction(userId: string, frontendEmail?: string, promoCode?: string, priceId?: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      // Use email from frontend (Clerk) if provided, otherwise use database email
      const emailToUse = frontendEmail || user.email;

      let customerId: string | null = user.paddleCustomerId ?? null;

      // If we don't have the customer ID in database, try to create or find it
      if (!customerId) {
        this.logger.log(`No paddleCustomerId in DB for user ${userId}. Attempting to create Paddle customer with email: ${emailToUse}`);
        try {
          const customer = await this.paddle.customers.create({
            email: emailToUse,
            name: user.fullName || undefined,
          });
          customerId = customer.id;
          this.logger.log(`✓ Created new Paddle customer: ${customerId}`);

          await this.prisma.user.update({
            where: { id: userId },
            data: { paddleCustomerId: customerId },
          });
        } catch (err: any) {
          const status = err?.status || err?.response?.status;
          const body = err?.response?.data || err?.body || err?.message;
          const errorMsg = typeof body === 'string' ? body : JSON.stringify(body);

          // Handle 409 Conflict - customer already exists in Paddle with this email
          if (status === 409 && errorMsg.includes('customer email conflicts')) {
            // Extract the existing customer ID from the error message
            // Format: "customer email conflicts with customer of id ctm_01kbm13zhpvrazqvesc3peeh8a"
            const match = errorMsg.match(/id\s+(ctm_\w+)/);
            if (match && match[1]) {
              const existingCustomerId = match[1];
              this.logger.log(`⚠️ Customer already exists in Paddle: ${existingCustomerId}. Syncing to database.`);
              customerId = existingCustomerId;

              // Store the existing customer ID in database so we don't try to create again
              await this.prisma.user.update({
                where: { id: userId },
                data: { paddleCustomerId: existingCustomerId },
              });
            } else {
              this.logger.error(
                `✗ 409 error but couldn't extract customer ID from: ${errorMsg}`,
              );
              throw new InternalServerErrorException(
                'Could not create checkout session. Please try again later.',
              );
            }
          } else {
            this.logger.error(
              `✗ Paddle error (customers.create) status=${status} message=${errorMsg}`,
            );
            throw new InternalServerErrorException(
              'Could not create checkout session. Please try again later.',
            );
          }
        }
      } else {
        // Customer ID already in database
        this.logger.log(`✓ Using existing Paddle customer: ${customerId}`);

        // Update email if provided from frontend and different
        if (frontendEmail && frontendEmail !== user.email) {
          this.logger.log(`Updating Paddle customer ${customerId} email to: ${frontendEmail}`);
          try {
            await this.paddle.customers.update(customerId, {
              email: frontendEmail,
            });
          } catch (err: any) {
            this.logger.warn(`Failed to update customer email: ${err.message}`);
            // Don't fail checkout if email update fails, just log it
          }
        }
      }

      this.logger.log(
        `Creating Paddle transaction for user ${userId} (customer: ${customerId}).`,
      );

      try {
        const finalPriceId = priceId || this.configService.get<string>('PADDLE_PRICE_ID');
        if (!finalPriceId) {
          this.logger.error('PADDLE_PRICE_ID is missing and no priceId provided. Set it in your environment or pass it in.');
          throw new InternalServerErrorException(
            'Billing is misconfigured (missing price). Please contact support.',
          );
        }

        this.logger.log(`Creating transaction with priceId: ${finalPriceId}, customerId: ${customerId}`);

        let discountId: string | undefined;

        if (promoCode) {
          const promo = await this.prisma.promoCode.findUnique({ where: { code: promoCode } });
          if (promo && promo.isActive && promo.paddleDiscountId) {
            // Check expiry and usage
            if (promo.expiresAt && new Date() > promo.expiresAt) {
              this.logger.warn(`Promo code ${promoCode} expired.`);
            } else if (promo.maxUses && promo.usedCount >= promo.maxUses) {
              this.logger.warn(`Promo code ${promoCode} usage limit reached.`);
            } else {
              discountId = promo.paddleDiscountId;
              this.logger.log(`Applying discount ${discountId} for code ${promoCode}`);
            }
          }
        }

        const transaction = await this.paddle.transactions.create({
          items: [{ priceId: finalPriceId, quantity: 1 }],
          customerId: customerId as string,
          discountId: discountId,
          customData: { internal_user_id: userId },
        });

        this.logger.log(
          `✓ Successfully created Paddle transaction ${transaction.id} for user ${userId}.`,
        );
        return { transactionId: transaction.id };
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        const body = err?.response?.data || err?.body || err?.message;
        const errorMsg = typeof body === 'string' ? body : JSON.stringify(body);
        this.logger.error(
          `✗ Paddle error (transactions.create) status=${status} message=${errorMsg}`,
        );
        // Log the full error for debugging
        this.logger.error(`Full error object: ${JSON.stringify(err)}`);
        throw new InternalServerErrorException(
          'Could not create checkout session. Please try again later.',
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Already logged above; rethrow a safe message.
      throw new InternalServerErrorException(
        'Could not create checkout session. Please try again later.',
      );
    }
  }

  async unmarshalWebhook(rawBody: string, signature: string) {
    const secret = this.configService.get<string>('PADDLE_WEBHOOK_SECRET_KEY');
    if (!secret) {
      this.logger.error('PADDLE_WEBHOOK_SECRET_KEY is missing. Cannot verify webhook.');
      throw new InternalServerErrorException('Webhook secret is missing');
    }
    try {
      return this.paddle.webhooks.unmarshal(rawBody, secret, signature);
    } catch (e: any) {
      this.logger.error(`Webhook signature verification failed: ${e.message}`);
      throw new InternalServerErrorException('Invalid webhook signature');
    }
  }

  async handleWebhookEvent(event: any) {
    const eventType = event.eventType || event.event_type;
    const data = event.data;

    if (!data) {
      this.logger.warn(`Webhook event ${eventType} is missing data.`);
      return;
    }

    const customerId = data.customer_id;
    const subscriptionId = data.id;

    if (!customerId) {
      this.logger.warn(`Webhook event ${eventType} is missing customer_id.`);
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`Received webhook for unknown paddle customer: ${customerId}`);
      return;
    }

    // Cast mapped status to any to satisfy Prisma input if generated types are strict
    const newStatus = this.mapPaddleStatus(data.status) as any;

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.resumed':
      case 'subscription.activated':
        // Extract billing dates if available
        const updateData: any = {
          subscriptionStatus: newStatus,
          paddleSubscriptionId: subscriptionId,
        };

        // Update pro access expiration if available
        if (data.next_billed_at) {
          updateData.proAccessExpiresAt = new Date(data.next_billed_at).toISOString();
        }

        // If subscription is now active, clear/update trial end date
        if (newStatus === SubscriptionStatus.ACTIVE) {
          this.logger.log(`User ${user.id} subscription activated - no longer in trial`);
          // Trial is over when subscription activates
          if (!updateData.proAccessExpiresAt && data.next_billed_at) {
            updateData.proAccessExpiresAt = new Date(data.next_billed_at).toISOString();
          }

          // REFERRAL REWARD LOGIC
          // If this is the FIRST activation (we can check if we already processed this? Or just check if referredByUserId exists and we haven't rewarded yet?)
          // For simplicity, we'll reward every time it goes ACTIVE (which might be monthly? No, usually just once or on renewal).
          // Actually, 'subscription.activated' happens once. 'subscription.updated' happens on renewal.
          // We want to reward when the referred user PAYS.
          // 'subscription.activated' usually means payment success.

          if (eventType === 'subscription.activated' && (user as any).referredByUserId) {
            // Refresh user to check hasRewardedReferrer
            const freshUser = await this.prisma.user.findUnique({ where: { id: user.id } });

            if (freshUser && !freshUser.hasRewardedReferrer) {
              const referrer = await this.prisma.user.findUnique({ where: { id: freshUser.referredByUserId } });

              if (referrer) {
                this.logger.log(`Processing Referral Reward: User ${user.id} paid. Rewarding Referrer ${referrer.id}`);

                // Add 30 days to referrer's proAccessExpiresAt
                const currentExpiry = referrer.proAccessExpiresAt ? new Date(referrer.proAccessExpiresAt) : new Date();
                // If expired, start from now. If active, add to existing.
                const basisDate = currentExpiry > new Date() ? currentExpiry : new Date();
                basisDate.setDate(basisDate.getDate() + 30);

                await this.prisma.user.update({
                  where: { id: referrer.id },
                  data: { proAccessExpiresAt: basisDate }
                });

                // Mark user as having rewarded their referrer
                await this.prisma.user.update({
                  where: { id: user.id },
                  data: { hasRewardedReferrer: true }
                });

                this.logger.log(`✓ Added 30 days to Referrer ${referrer.id}. New Expiry: ${basisDate.toISOString()}`);
              }
            }
          }
        }

        await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        this.logger.log(`Updated subscription for user ${user.id} to ${data.status}`);
        break;

      case 'subscription.paused':
      case 'subscription.canceled':
        await this.prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: SubscriptionStatus.CANCELED as any },
        });
        this.logger.log(`Canceled subscription for user ${user.id}`);
        break;

      default:
        this.logger.log(`Unhandled Paddle webhook event type: ${eventType}`);
    }
  }

  async createDiscount(code: string, type: 'percentage' | 'flat', amount: number) {
    try {
      const discount = await this.paddle.discounts.create({
        description: `Promo Code: ${code}`,
        type: type,
        amount: amount.toString(),
        code: code,
      });
      return discount;
    } catch (err: any) {
      this.logger.error(`Failed to create Paddle discount: ${err.message}`);
      throw new InternalServerErrorException('Failed to create discount in payment provider');
    }
  }

  private mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
    switch (paddleStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'paused':
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      default:
        this.logger.warn(`Unknown Paddle status encountered: ${paddleStatus}`);
        return SubscriptionStatus.TRIALING;
    }
  }
}