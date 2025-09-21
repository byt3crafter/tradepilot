import { Module } from '@nestjs/common';
import { TradeJournalsService } from './trade-journals.service';
import { TradeJournalsController } from './trade-journals.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TradesModule } from 'src/trades/trades.module';

@Module({
  imports: [PrismaModule, TradesModule],
  controllers: [TradeJournalsController],
  providers: [TradeJournalsService]
})
export class TradeJournalsModule {}
