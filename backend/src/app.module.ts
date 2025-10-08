import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from './config/config.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JoiValidationSchema } from './config/config.schema';
import { BrokerAccountsModule } from './broker-accounts/broker-accounts.module';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { ChecklistRulesModule } from './checklist-rules/checklist-rules.module';
import { TradesModule } from './trades/trades.module';
import { AiModule } from './ai/ai.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { TradeJournalsModule } from './trade-journals/trade-journals.module';
import { AssetsModule } from './assets/assets.module';
import { AnalyticsModule } from './analytics/analytics.module';


@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: JoiValidationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    ConfigModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    MailModule,
    BrokerAccountsModule,
    PlaybooksModule,
    ChecklistRulesModule,
    TradesModule,
    AiModule,
    BillingModule,
    AdminModule,
    TradeJournalsModule,
    AssetsModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}