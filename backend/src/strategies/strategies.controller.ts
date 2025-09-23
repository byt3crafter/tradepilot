import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
// FIX: Corrected DTO import name to CreatePlaybookDto.
import { CreatePlaybookDto } from './dtos/create-strategy.dto';
// FIX: Corrected DTO import name to UpdatePlaybookDto.
import { UpdatePlaybookDto } from './dtos/update-strategy.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Post()
  // FIX: Corrected type hint and variable name to CreatePlaybookDto.
  create(@Body() createPlaybookDto: CreatePlaybookDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.strategiesService.create(userId, createPlaybookDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.strategiesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.strategiesService.findOne(id, userId);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.strategiesService.getPlaybookStats(id, userId);
  }

  @Patch(':id')
  // FIX: Corrected type hint and variable name to UpdatePlaybookDto.
  update(@Param('id') id: string, @Body() updatePlaybookDto: UpdatePlaybookDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.strategiesService.update(id, userId, updatePlaybookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.strategiesService.remove(id, userId);
  }
}