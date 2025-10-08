
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from './config/config.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { AnalysisModule } from './analysis/analysis.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';


@Module({
  imports: [
    // This custom module correctly sets up the global NestConfigModule.
    // It should be one of the first modules imported.
    ConfigModule,
    
    // Configure ThrottlerModule asynchronously to use the ConfigService
    ThrottlerModule.forRootAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('THROTTLE_TTL'),
        limit: config.get<number>('THROTTLE_LIMIT'),
      }]),
    }),

    ScheduleModule.forRoot(),
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
    AnalysisModule,
    NotificationsModule,
    TasksModule,
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
