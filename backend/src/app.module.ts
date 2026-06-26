import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerGuard, ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BrokerAccountsModule } from './broker-accounts/broker-accounts.module';
import { UserActivityInterceptor } from './common/interceptors/user-activity.interceptor';

import { PlaybooksModule } from './playbooks/playbooks.module';
import { ChecklistRulesModule } from './checklist-rules/checklist-rules.module';
import { TradesModule } from './trades/trades.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { TradeJournalsModule } from './trade-journals/trade-journals.module';
import { AssetsModule } from './assets/assets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JoiValidationSchema } from './config/config.schema';
import { PdfModule } from './pdf/pdf.module';
import { InvitesModule } from './invites/invites.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { MarketDataModule } from './market-data/market-data.module';
import { NotebookModule } from './notebook/notebook.module';
import { CtraderModule } from './ctrader/ctrader.module';
import { QuantModule } from './quant/quant.module';
import { ChatgptModule } from './chatgpt/chatgpt.module';
import { AiModule } from './ai/ai.module';
import { ScheduleModule } from '@nestjs/schedule';


@Module({
  imports: [
    // Configure the official ConfigModule directly. This replaces the custom wrapper.
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: JoiValidationSchema,
      envFilePath: '.env',
    }),

    // Configure ThrottlerModule asynchronously to use the ConfigService
    ThrottlerModule.forRootAsync({
      imports: [NestConfigModule], // Explicitly import the official ConfigModule to ensure dependency order.
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [{
          ttl: config.getOrThrow<number>('THROTTLE_TTL'),
          limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
        }],
      }),
    }),

    AuthModule,
    UsersModule,
    PrismaModule,
    BrokerAccountsModule,
    PlaybooksModule,
    ChecklistRulesModule,
    TradesModule,
    BillingModule,
    AdminModule,
    TradeJournalsModule,
    AssetsModule,
    AnalyticsModule,
    NotificationsModule,
    PdfModule,
    InvitesModule,
    PromoCodesModule,
    MarketDataModule,
    NotebookModule,
    CtraderModule,
    QuantModule,
    ChatgptModule,
    AiModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserActivityInterceptor,
    }
  ],
})
export class AppModule { }