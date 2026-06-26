import { Module } from '@nestjs/common';
import { QuantController } from './quant.controller';
import { QuantService } from './quant.service';
import { PolymarketClient } from './polymarket.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuantController],
  providers: [QuantService, PolymarketClient],
  exports: [QuantService],
})
export class QuantModule {}
