import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
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
}
