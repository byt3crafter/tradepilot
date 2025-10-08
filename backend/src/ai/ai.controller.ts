import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { GenerateIdeaDto } from './dtos/generate-idea.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-idea')
  @HttpCode(HttpStatus.OK)
  async generateTradeIdea(@Body() generateIdeaDto: GenerateIdeaDto) {
    const idea = await this.aiService.generateTradeIdea(
        generateIdeaDto.asset, 
        generateIdeaDto.strategyType,
        generateIdeaDto.screenshotUrl
    );
    return { idea };
  }
}
