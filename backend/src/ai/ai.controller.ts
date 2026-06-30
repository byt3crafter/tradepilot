import { Controller, Post, Get, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { EntitlementGuard } from '../auth/guards/entitlement.guard';
import { AiService } from './ai.service';

// Paid/cost surface (Gemini/AI agent calls). EntitlementGuard enforces the paywall
// when free mode is OFF and no-ops while free mode is ON (SystemConfig.freeMode).
@UseGuards(JwtAccessGuard, EntitlementGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // ── Agent tool/skill registry + audit log ──
  @Get('tools')
  tools() {
    return this.ai.listTools();
  }
  @Post('tools')
  addTool(@Body() body: { name: string; description: string; method?: string; url: string; category?: string }) {
    return this.ai.addTool(body);
  }
  @Patch('tools/:id')
  toggleTool(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.ai.toggleTool(id, enabled);
  }
  @Delete('tools/:id')
  deleteTool(@Param('id') id: string) {
    return this.ai.deleteTool(id);
  }
  @Get('runs')
  runs(@Req() req: any) {
    return this.ai.listRuns(req.user.sub);
  }
  @Get('runs/:id')
  run(@Param('id') id: string, @Req() req: any) {
    return this.ai.getRun(req.user.sub, id);
  }

  // ── Scheduled agents ──
  @Get('schedules')
  schedules(@Req() req: any) {
    return this.ai.listSchedules(req.user.sub);
  }
  @Post('schedules')
  createSchedule(@Body() body: { name: string; goal: string; frequency?: string }, @Req() req: any) {
    return this.ai.createSchedule(req.user.sub, body);
  }
  @Patch('schedules/:id')
  updateSchedule(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.ai.updateSchedule(req.user.sub, id, body);
  }
  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string, @Req() req: any) {
    return this.ai.deleteSchedule(req.user.sub, id);
  }
  @Post('schedules/:id/run')
  runScheduleNow(@Param('id') id: string, @Req() req: any) {
    return this.ai.runScheduleNow(req.user.sub, id);
  }

  @Post('opportunities')
  opportunities(@Req() req: any) {
    return this.ai.opportunities(req.user.sub);
  }

  @Post('journal-analysis')
  journal(@Req() req: any) {
    return this.ai.journalAnalysis(req.user.sub);
  }

  @Post('strategy')
  strategy(@Req() req: any) {
    return this.ai.strategy(req.user.sub);
  }

  @Post('chat')
  chat(@Body('message') message: string, @Body('history') history: string, @Req() req: any) {
    return this.ai.chat(req.user.sub, message, history);
  }

  @Post('agent')
  agent(@Body('goal') goal: string, @Req() req: any) {
    return this.ai.agent(req.user.sub, goal);
  }
}
