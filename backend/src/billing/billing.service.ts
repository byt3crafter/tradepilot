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

    if (!apiKey) {
      this.logger.error('PADDLE_API_KEY is missing. Set it in your environment.');
      throw new Error('Missing PADDLE_API_KEY');
    }

    const options: PaddleOptions = {
      environment: paddleEnv === 'sandbox' ? Environment.sandbox : Environment.production,
      // timeout: 15000, // optional
    };

    this.paddle = new Paddle(apiKey, options);
    this.logger.log(`Paddle SDK initialized in "${paddleEnv}" mode.`);
  }

  async createCheckoutTransaction(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      let customerId: string | null = user.paddleCustomerId ?? null;

      if (!customerId) {
        this.logger.log(`Creating Paddle customer for user ${userId}.`);
        try {
          const customer = await this.paddle.customers.create({
            email: user.email,
            name: user.fullName || undefined,
          });
          customerId = customer.id;

          await this.prisma.user.update({
            where: { id: userId },
            data: { paddleCustomerId: customerId },
          });
        } catch (err: any) {
          const status = err?.status || err?.response?.status;
          const body = err?.response?.data || err?.body || err?.message;
          this.logger.error(
            `Paddle error (customers.create) status=${status} body=${JSON.stringify(body)}`,
          );
          throw new InternalServerErrorException(
            'Could not create checkout session. Please try again later.',
          );
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

        const transaction = await this.paddle.transactions.create({
          items: [{ priceId, quantity: 1 }],
          customerId: customerId as string,
          customData: { internal_user_id: userId },
        });

        this.logger.log(
          `Successfully created Paddle transaction ${transaction.id} for user ${userId}.`,
        );
        return { transactionId: transaction.id };
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        const body = err?.response?.data || err?.body || err?.message;
        this.logger.error(
          `Paddle error (transactions.create) status=${status} body=${JSON.stringify(body)}`,
        );
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
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: newStatus,
            paddleSubscriptionId: subscriptionId,
          },
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