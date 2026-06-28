import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { QuantService } from './quant.service';

@UseGuards(JwtAccessGuard)
@SkipThrottle() // quant reads are JWT-guarded polling intelligence endpoints; costly POSTs re-throttled below
@Controller('quant')
export class QuantController {
  constructor(private readonly quant: QuantService) {}

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.quant.leaderboard(limit ? parseInt(limit, 10) : 50);
  }

  @Get('stats')
  stats() {
    return this.quant.stats();
  }

  @Get('learning')
  learning() {
    return this.quant.learningStats();
  }

  @Get('learning/policy')
  learnedPolicy() {
    return this.quant.learnedPolicy();
  }

  @Get('learning/decisions')
  learningDecisions(@Query('limit') limit?: string, @Query('sample') sample?: string, @Query('mode') mode?: string) {
    return this.quant.learningDecisions(limit ? parseInt(limit, 10) : 60, sample === 'all' ? 'all' : 'live', mode);
  }

  @Get('simulation')
  simulation(@Query('bankroll') bankroll?: string, @Query('risk') risk?: string, @Query('sample') sample?: string) {
    return this.quant.simulate(
      bankroll ? parseFloat(bankroll) : 50,
      risk ? parseFloat(risk) : 0.05,
      sample === 'historical' ? 'historical' : 'live',
    );
  }

  @Get('feed')
  feed(@Query('limit') limit?: string) {
    return this.quant.feed(limit ? parseInt(limit, 10) : 40);
  }

  @Get('markets')
  markets(@Query('q') q?: string) {
    return this.quant.markets(q);
  }

  @Get('arbs')
  arbs() {
    return this.quant.scanArbs();
  }

  @Get('signals')
  signals() {
    return this.quant.signals();
  }

  @Get('wallet/:address')
  wallet(@Param('address') address: string) {
    return this.quant.getWallet(address);
  }

  @Get('wallet/:address/positions')
  walletPositions(@Param('address') address: string) {
    return this.quant.walletPositions(address);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('scan')
  scan(@Body('address') address: string) {
    return this.quant.scanWallet(address);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verdict')
  verdict(@Body('address') address: string, @Req() req: any) {
    return this.quant.aiVerdict(req.user.sub, address);
  }

  @Throttle({ default: { limit: 4, ttl: 60000 } })
  @Post('discover')
  discover() {
    return this.quant.discover(200);
  }

  @Throttle({ default: { limit: 3, ttl: 120000 } }) // AI calls cost — cap hard
  @Post('ai-scan')
  aiScan() {
    return this.quant.aiMispricingScan(6);
  }
}
