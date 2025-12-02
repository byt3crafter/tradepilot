import { Module } from '@nestjs/common';
import { TradeJournalsService } from './trade-journals.service';
import { TradeJournalsController } from './trade-journals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TradesModule } from '../trades/trades.module';

@Module({
  imports: [PrismaModule, TradesModule],
  controllers: [TradeJournalsController],
  providers: [TradeJournalsService]
})
export class TradeJournalsModule {}
