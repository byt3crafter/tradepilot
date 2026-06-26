import { Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CtraderService } from './ctrader.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('ctrader')
export class CtraderController {
  constructor(private readonly ctrader: CtraderService) {}

  // Returns the cTrader authorize URL; the frontend redirects the browser to it.
  @UseGuards(JwtAccessGuard)
  @Get('connect')
  connect(@Req() req: AuthenticatedRequest) {
    return { url: this.ctrader.buildAuthUrl(req.user.sub) };
  }

  // cTrader redirects here after the user grants access (no app JWT present).
  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const redirect = await this.ctrader.handleCallback(code, state);
    return res.redirect(redirect);
  }

  @UseGuards(JwtAccessGuard)
  @Get('status')
  status(@Req() req: AuthenticatedRequest) {
    return this.ctrader.getStatus(req.user.sub);
  }

  @UseGuards(JwtAccessGuard)
  @Post('disconnect')
  disconnect(@Req() req: AuthenticatedRequest) {
    return this.ctrader.disconnect(req.user.sub);
  }
}
