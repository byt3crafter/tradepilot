import { Module } from '@nestjs/common';
import { ChecklistRulesService } from './checklist-rules.service';
import { ChecklistRulesController } from './checklist-rules.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChecklistRulesController],
  providers: [ChecklistRulesService],
})
export class ChecklistRulesModule {}
