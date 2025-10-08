
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dtos/create-analysis.dto';
import { UpdateAnalysisDto } from './dtos/update-analysis.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  create(@Body() createAnalysisDto: CreateAnalysisDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.analysisService.create(userId, createAnalysisDto);
  }

  @Get()
  findAll(@Query('brokerAccountId') brokerAccountId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.analysisService.findAllByAccount(userId, brokerAccountId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAnalysisDto: UpdateAnalysisDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.analysisService.update(id, userId, updateAnalysisDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.analysisService.remove(id, userId);
  }
}
