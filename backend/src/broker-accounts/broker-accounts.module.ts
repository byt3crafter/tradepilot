import { Module } from '@nestjs/common';
import { BrokerAccountsService } from './broker-accounts.service';
import { BrokerAccountsController } from './broker-accounts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DrawdownService } from './drawdown.service';

@Module({
  imports: [PrismaModule],
  controllers: [BrokerAccountsController],
  providers: [BrokerAccountsService, DrawdownService],
  exports: [BrokerAccountsService],
})
export class BrokerAccountsModule {}
