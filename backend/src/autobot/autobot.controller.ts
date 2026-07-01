import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { AutobotService } from './autobot.service';

@UseGuards(JwtAccessGuard)
@Controller('autobot')
export class AutobotController {
  constructor(private readonly bot: AutobotService) {}

  @Get('status')
  status(@Req() req: any) {
    return this.bot.status(req.user.sub);
  }

  @Get('trades')
  trades(@Req() req: any, @Query('limit') limit?: string) {
    return this.bot.trades(req.user.sub, limit ? parseInt(limit, 10) : 60);
  }

  @Get('performance')
  performance(@Req() req: any) {
    return this.bot.performance(req.user.sub);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('mode')
  mode(@Req() req: any, @Body('mode') mode: string) {
    return this.bot.setMode(req.user.sub, mode === 'auto' ? 'auto' : 'off');
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('kill')
  kill(@Req() req: any) {
    return this.bot.kill(req.user.sub);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('limits')
  limits(@Req() req: any, @Body() body: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number }) {
    return this.bot.setLimits(req.user.sub, body || {});
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('withdraw')
  withdraw(@Req() req: any, @Body('to') to: string) {
    return this.bot.withdraw(req.user.sub, to);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('export-key')
  exportKey(@Req() req: any) {
    return this.bot.exportPrivateKey(req.user.sub);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('funder')
  funder(@Req() req: any, @Body('address') address: string) {
    return this.bot.setFunder(req.user.sub, address);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('clear-trades')
  clearTrades(@Req() req: any, @Body('id') id?: string) {
    return this.bot.clearTrades(req.user.sub, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('strategies')
  strategies(@Req() req: any, @Body() body: { copy?: boolean; ai?: boolean; arb?: boolean }) {
    return this.bot.setStrategies(req.user.sub, body || {});
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('arb-config')
  arbConfig(@Req() req: any, @Body() body: any) {
    return this.bot.setArbConfig(req.user.sub, body || {});
  }

  @Get('opportunities')
  opportunities(@Req() req: any) {
    return this.bot.opportunities(req.user.sub);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('manual-trade')
  manualTrade(@Req() req: any, @Body() body: any) {
    return this.bot.manualTrade(req.user.sub, body || {});
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('assess')
  assess(@Req() req: any, @Body() body: any) {
    return this.bot.assess(req.user.sub, body || {});
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('copilot')
  copilot(@Req() req: any, @Body('question') question: string) {
    return this.bot.copilot(req.user.sub, question);
  }

  @Get('analytics')
  analytics(@Req() req: any) {
    return this.bot.analytics(req.user.sub);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('tune-advice')
  tuneAdvice(@Req() req: any) {
    return this.bot.tuneAdvice(req.user.sub);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('close')
  close(@Req() req: any, @Body('tokenId') tokenId: string) {
    return this.bot.closePosition(req.user.sub, tokenId);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('close-all')
  closeAll(@Req() req: any) {
    return this.bot.closeAll(req.user.sub);
  }
}
