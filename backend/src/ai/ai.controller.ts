import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAccessGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

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
