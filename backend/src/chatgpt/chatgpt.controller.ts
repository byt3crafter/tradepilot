import { Controller, Get, Post, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { EntitlementGuard } from '../auth/guards/entitlement.guard';
import { ChatgptService } from './chatgpt.service';

interface AuthedRequest extends Request {
  user: { sub: string };
}

// Paid/cost surface (ChatGPT integration). EntitlementGuard enforces the paywall
// when free mode is OFF and no-ops while free mode is ON (SystemConfig.freeMode).
@UseGuards(JwtAccessGuard, EntitlementGuard)
@Controller('chatgpt')
export class ChatgptController {
  constructor(private readonly chatgpt: ChatgptService) {}

  @Post('start')
  start(@Req() req: AuthedRequest) {
    return this.chatgpt.start(req.user.sub);
  }

  @Post('exchange')
  exchange(@Body('code') code: string, @Body('state') state: string, @Req() req: AuthedRequest) {
    return this.chatgpt.exchange(req.user.sub, code, state);
  }

  @Get('status')
  status(@Req() req: AuthedRequest) {
    return this.chatgpt.status(req.user.sub);
  }

  @Get('models')
  models(@Req() req: AuthedRequest) {
    return this.chatgpt.listModels(req.user.sub);
  }

  @Post('disconnect')
  disconnect(@Req() req: AuthedRequest) {
    return this.chatgpt.disconnect(req.user.sub);
  }

  @Patch('model')
  setModel(@Body('model') model: string, @Req() req: AuthedRequest) {
    return this.chatgpt.setModel(req.user.sub, model);
  }

  @Patch('permissions')
  setPermissions(
    @Body() body: { verdict?: boolean; bot?: boolean; analysis?: boolean },
    @Req() req: AuthedRequest,
  ) {
    return this.chatgpt.setPermissions(req.user.sub, body);
  }
}
