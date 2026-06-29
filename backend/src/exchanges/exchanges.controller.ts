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

  @Get('status')
  status() {
    return this.exchanges.credentialStatus();
  }

  // Admin-only: set exchange API key/secret (stored AES-encrypted).
  @UseGuards(AdminGuard)
  @Post('keys')
  setKeys(@Body() b: { exchange: string; apiKey: string; apiSecret: string; testnet?: boolean }) {
    return this.exchanges.setCredential(b.exchange, b.apiKey, b.apiSecret, b.testnet ?? true);
  }
}
