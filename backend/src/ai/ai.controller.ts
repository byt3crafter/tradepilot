import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { EntitlementGuard } from '../auth/guards/entitlement.guard';
import { GenerateIdeaDto } from './dtos/generate-idea.dto';
import { ParseTradeTextDto } from './dtos/parse-trade-text.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  }
}

// These endpoints call the Gemini LLM (real per-request cost), so they require
// an active subscription — not just authentication. EntitlementGuard runs after
// JwtAccessGuard, which populates req.user.
@UseGuards(JwtAccessGuard, EntitlementGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('generate-idea')
  @HttpCode(HttpStatus.OK)
  async generateTradeIdea(@Req() req: AuthenticatedRequest, @Body() generateIdeaDto: GenerateIdeaDto) {
    const userId = req.user.sub;
    const idea = await this.aiService.generateTradeIdea(
      userId,
      generateIdeaDto.asset,
      generateIdeaDto.strategyType,
      generateIdeaDto.screenshotUrl
    );
    return { idea };
  }

  @Post('parse-trade-text')
  @HttpCode(HttpStatus.OK)
  async parseTradeText(@Req() req: AuthenticatedRequest, @Body() parseTradeTextDto: ParseTradeTextDto) {
    const userId = req.user.sub;
    return await this.aiService.parseTradeText(
      userId,
      parseTradeTextDto.text,
      parseTradeTextDto.availableAssets
    );
  }
}
