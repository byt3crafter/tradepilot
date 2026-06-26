import { Module } from '@nestjs/common';
import { CtraderController } from './ctrader.controller';
import { CtraderService } from './ctrader.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CtraderController],
  providers: [CtraderService],
  exports: [CtraderService],
})
export class CtraderModule {}
