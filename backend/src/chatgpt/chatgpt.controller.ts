import { Controller, Get, Post, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { ChatgptService } from './chatgpt.service';

interface AuthedRequest extends Request {
  user: { sub: string };
}

@UseGuards(JwtAccessGuard)
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

  @Post('disconnect')
  disconnect(@Req() req: AuthedRequest) {
    return this.chatgpt.disconnect(req.user.sub);
  }

  @Patch('permissions')
  setPermissions(
    @Body() body: { verdict?: boolean; bot?: boolean; analysis?: boolean },
    @Req() req: AuthedRequest,
  ) {
    return this.chatgpt.setPermissions(req.user.sub, body);
  }
}
