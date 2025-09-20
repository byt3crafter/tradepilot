import { Module } from '@nestjs/common';
import { BrokerAccountsService } from './broker-accounts.service';
import { BrokerAccountsController } from './broker-accounts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrokerAccountsController],
  providers: [BrokerAccountsService],
})
export class BrokerAccountsModule {}
