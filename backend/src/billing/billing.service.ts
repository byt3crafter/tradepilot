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

    // Log all config on startup for debugging
    this.logger.log(`[Config] PADDLE_ENV: ${paddleEnv}`);
    this.logger.log(`[Config] PADDLE_API_KEY: ${apiKey ? '✓ Set' : '✗ MISSING'}`);
    this.logger.log(`[Config] PADDLE_PRICE_ID: ${priceId ? '✓ Set' : '✗ MISSING'}`);
    this.logger.log(`[Config] PADDLE_CLIENT_SIDE_TOKEN: ${clientToken ? '✓ Set' : '✗ MISSING'}`);

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

  async createCheckoutTransaction(userId: string, frontendEmail?: string) {
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
        const priceId = this.configService.get<string>('PADDLE_PRICE_ID');
        if (!priceId) {
          this.logger.error('PADDLE_PRICE_ID is missing. Set it in your environment.');
          throw new InternalServerErrorException(
            'Billing is misconfigured (missing price). Please contact support.',
          );
        }

        this.logger.log(`Creating transaction with priceId: ${priceId}, customerId: ${customerId}`);

        const transaction = await this.paddle.transactions.create({
          items: [{ priceId, quantity: 1 }],
          customerId: customerId as string,
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

  async handleWebhookEvent(event: any) {
    const { event_type, data } = event;

    if (!data) {
      this.logger.warn(`Webhook event ${event_type} is missing data.`);
      return;
    }

    const customerId = data.customer_id;
    const subscriptionId = data.id;

    if (!customerId) {
      this.logger.warn(`Webhook event ${event_type} is missing customer_id.`);
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

    switch (event_type) {
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
        this.logger.log(`Unhandled Paddle webhook event type: ${event_type}`);
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