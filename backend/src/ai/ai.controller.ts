import { Controller, Post, Get, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAccessGuard)
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
