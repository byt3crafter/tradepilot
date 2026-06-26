import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { NotebookService } from './notebook.service';
import { CreateNotebookEntryDto } from './dtos/create-notebook-entry.dto';
import { UpdateNotebookEntryDto } from './dtos/update-notebook-entry.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@UseGuards(JwtAccessGuard)
@Controller('notebook')
export class NotebookController {
  constructor(private readonly notebook: NotebookService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.notebook.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notebook.findOne(req.user.sub, id);
  }

  @Post()
  create(@Body() dto: CreateNotebookEntryDto, @Req() req: AuthenticatedRequest) {
    return this.notebook.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNotebookEntryDto, @Req() req: AuthenticatedRequest) {
    return this.notebook.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notebook.remove(req.user.sub, id);
  }
}
