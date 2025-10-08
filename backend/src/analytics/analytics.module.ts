import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BrokerAccountsModule } from '../broker-accounts/broker-accounts.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [PrismaModule, BrokerAccountsModule, AssetsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
