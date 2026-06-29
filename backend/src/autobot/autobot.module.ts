import { Module } from '@nestjs/common';
import { AutobotController } from './autobot.controller';
import { AutobotService } from './autobot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QuantModule } from '../quant/quant.module';

@Module({
  imports: [PrismaModule, QuantModule],
  controllers: [AutobotController],
  providers: [AutobotService],
  exports: [AutobotService],
})
export class AutobotModule {}
