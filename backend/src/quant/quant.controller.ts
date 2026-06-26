import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { QuantService } from './quant.service';

@UseGuards(JwtAccessGuard)
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

  @Get('wallet/:address')
  wallet(@Param('address') address: string) {
    return this.quant.getWallet(address);
  }

  @Post('scan')
  scan(@Body('address') address: string) {
    return this.quant.scanWallet(address);
  }

  @Post('verdict')
  verdict(@Body('address') address: string, @Req() req: any) {
    return this.quant.aiVerdict(req.user.sub, address);
  }

  @Post('discover')
  discover() {
    return this.quant.discover(200);
  }
}
