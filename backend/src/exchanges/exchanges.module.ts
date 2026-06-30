import { Module } from '@nestjs/common';
import { ExchangesController } from './exchanges.controller';
import { ExchangesService } from './exchanges.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BrainModule } from '../brain/brain.module';

@Module({
  imports: [PrismaModule, BrainModule],
  controllers: [ExchangesController],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}
