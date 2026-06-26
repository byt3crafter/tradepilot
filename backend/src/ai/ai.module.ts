import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatgptModule } from '../chatgpt/chatgpt.module';
import { QuantModule } from '../quant/quant.module';

@Module({
  imports: [PrismaModule, ChatgptModule, QuantModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
