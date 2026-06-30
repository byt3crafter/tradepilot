import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BrainService } from './brain.service';
import { BrainController } from './brain.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BrainController],
  providers: [BrainService],
  exports: [BrainService], // other modules (autobot, exchanges, …) publish to the brain
})
export class BrainModule {}
