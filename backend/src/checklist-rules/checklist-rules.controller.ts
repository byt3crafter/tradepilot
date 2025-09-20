import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ChecklistRulesService } from './checklist-rules.service';
import { CreateChecklistRuleDto } from './dtos/create-checklist-rule.dto';
import { UpdateChecklistRuleDto } from './dtos/update-checklist-rule.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('checklist-rules')
export class ChecklistRulesController {
  constructor(private readonly checklistRulesService: ChecklistRulesService) {}

  @Post()
  create(@Body() createChecklistRuleDto: CreateChecklistRuleDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.checklistRulesService.create(userId, createChecklistRuleDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.checklistRulesService.findAll(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChecklistRuleDto: UpdateChecklistRuleDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.checklistRulesService.update(id, userId, updateChecklistRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.checklistRulesService.remove(id, userId);
  }
}
