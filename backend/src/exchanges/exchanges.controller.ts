import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ExchangesService } from './exchanges.service';

@UseGuards(JwtAccessGuard)
@SkipThrottle()
@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchanges: ExchangesService) {}

  @Get('list')
  list() {
    return this.exchanges.list();
  }

  @Get('funding')
  funding(@Query('exchange') exchange?: string) {
    return this.exchanges.fundingScan(exchange || 'binance');
  }

  @Get('volatility')
  volatility(@Query('exchange') exchange?: string) {
    return this.exchanges.volatilityScan(exchange || 'binance');
  }

  @Get('momentum')
  momentum(@Query('exchange') exchange?: string) {
    return this.exchanges.momentumScan(exchange || 'binance');
  }

  @Get('status')
  status() {
    return this.exchanges.credentialStatus();
  }

  @Get('performance')
  performance(@Query('strategy') strategy?: string) {
    return this.exchanges.performance(strategy || 'funding');
  }

  @Get('paper-trades')
  paperTrades(@Query('strategy') strategy?: string, @Query('limit') limit?: string) {
    return this.exchanges.paperTrades(strategy || 'funding', limit ? parseInt(limit, 10) : 60);
  }

  // Admin-only: set exchange API key/secret (stored AES-encrypted).
  @UseGuards(AdminGuard)
  @Post('keys')
  setKeys(@Body() b: { exchange: string; apiKey: string; apiSecret: string; testnet?: boolean }) {
    return this.exchanges.setCredential(b.exchange, b.apiKey, b.apiSecret, b.testnet ?? true);
  }

  @UseGuards(AdminGuard)
  @Post('test')
  test(@Body('exchange') exchange?: string) {
    return this.exchanges.testConnection(exchange || 'binance');
  }

  @UseGuards(AdminGuard)
  @Post('test-trade')
  testTrade(@Body() b: { exchange?: string; symbol?: string; usd?: number }) {
    return this.exchanges.testTrade(b.exchange || 'binance', b.symbol || 'BTCUSDT', b.usd || 20);
  }

  // ── Crypto Auto Bot ──
  @Get('bot')
  botStatus(@Query('exchange') exchange?: string) {
    return this.exchanges.botStatus(exchange || 'binance');
  }

  @Get('bot/trades')
  botTrades(@Query('exchange') exchange?: string, @Query('limit') limit?: string) {
    return this.exchanges.botTrades(exchange || 'binance', limit ? parseInt(limit, 10) : 60);
  }

  @Get('bot/performance')
  botPerformance(@Query('exchange') exchange?: string) {
    return this.exchanges.botPerformance(exchange || 'binance');
  }

  @UseGuards(AdminGuard)
  @Post('bot/mode')
  botMode(@Body() b: { exchange?: string; mode: string }) {
    return this.exchanges.botSetMode(b.exchange || 'binance', b.mode === 'auto' ? 'auto' : 'off');
  }

  @UseGuards(AdminGuard)
  @Post('bot/kill')
  botKill(@Body('exchange') exchange?: string) {
    return this.exchanges.botKill(exchange || 'binance');
  }

  @UseGuards(AdminGuard)
  @Post('bot/limits')
  botLimits(@Body() b: { exchange?: string; maxPerTradeUsd?: number; maxTotalUsd?: number }) {
    return this.exchanges.botSetLimits(b.exchange || 'binance', b);
  }
}
