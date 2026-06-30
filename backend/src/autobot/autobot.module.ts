import { Module } from '@nestjs/common';
import { AutobotController } from './autobot.controller';
import { AutobotService } from './autobot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QuantModule } from '../quant/quant.module';
import { BrainModule } from '../brain/brain.module';
import { ChatgptModule } from '../chatgpt/chatgpt.module';

@Module({
  imports: [PrismaModule, QuantModule, BrainModule, ChatgptModule],
  controllers: [AutobotController],
  providers: [AutobotService],
  exports: [AutobotService],
})
export class AutobotModule {}
