import { Body, Controller, Get, Post, Query, Req, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { Observable, map, merge, interval } from 'rxjs';
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
    const events = this.brain.stream(req.user.sub, module).pipe(map((e) => ({ data: e } as MessageEvent)));
    // Heartbeat every 15s so idle connections (the bot ticks only every few min) aren't dropped
    // by the browser / proxy. The client ignores kind:'ping'.
    const heartbeat = interval(15000).pipe(map(() => ({ data: { kind: 'ping', ts: Date.now() } } as MessageEvent)));
    return merge(events, heartbeat);
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

  @UseGuards(JwtAccessGuard)
  @Get('level')
  level() {
    return { level: this.brain.getLevel() };
  }

  @UseGuards(JwtAccessGuard)
  @Post('level')
  setLevel(@Body('level') level: any) {
    return { level: this.brain.setLevel(level) };
  }
}
