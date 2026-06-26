import { Module } from '@nestjs/common';
import { QuantController } from './quant.controller';
import { QuantService } from './quant.service';
import { PolymarketClient } from './polymarket.client';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatgptModule } from '../chatgpt/chatgpt.module';

@Module({
  imports: [PrismaModule, ChatgptModule],
  controllers: [QuantController],
  providers: [QuantService, PolymarketClient],
  exports: [QuantService],
})
export class QuantModule {}
