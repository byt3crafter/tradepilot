import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesController } from './trades.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BrokerAccountsModule } from '../broker-accounts/broker-accounts.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [PrismaModule, BrokerAccountsModule, AssetsModule],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
