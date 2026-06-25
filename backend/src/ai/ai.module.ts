import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementGuard } from '../auth/guards/entitlement.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AiController],
  providers: [AiService, EntitlementGuard],
  exports: [AiService],
})
export class AiModule { }
