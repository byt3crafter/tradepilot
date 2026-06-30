import { Controller, Get, Query, Req, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SseJwtGuard } from './sse-jwt.guard';
import { BrainService } from './brain.service';

@Controller('brain')
export class BrainController {
  constructor(private readonly brain: BrainService) {}

  /** Live "neurons firing" stream (SSE). Auth via ?token= (EventSource can't set headers). */
  @UseGuards(SseJwtGuard)
  @Sse('stream')
  stream(@Req() req: any, @Query('module') module?: string): Observable<MessageEvent> {
    return this.brain.stream(req.user.sub, module).pipe(map((e) => ({ data: e } as MessageEvent)));
  }

  @UseGuards(JwtAccessGuard)
  @Get('events')
  events(@Req() req: any, @Query('module') module?: string) {
    return this.brain.recent(req.user.sub, module);
  }

  @UseGuards(JwtAccessGuard)
  @Get('scoreboard')
  scoreboard(@Req() req: any) {
    return this.brain.scoreboard(req.user.sub);
  }
}
