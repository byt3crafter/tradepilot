
import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BrokerAccountsModule } from '../broker-accounts/broker-accounts.module';

@Module({
  imports: [PrismaModule, BrokerAccountsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
