import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PlaybooksService } from './playbooks.service';
import { CreatePlaybookDto } from './dtos/create-playbook.dto';
import { UpdatePlaybookDto } from './dtos/update-playbook.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Post()
  create(@Body() createPlaybookDto: CreatePlaybookDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.playbooksService.create(userId, createPlaybookDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.playbooksService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.playbooksService.findOne(id, userId);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.playbooksService.getPlaybookStats(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlaybookDto: UpdatePlaybookDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.playbooksService.update(id, userId, updatePlaybookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.playbooksService.remove(id, userId);
  }
}