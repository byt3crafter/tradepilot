import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CreateAssetSpecDto } from './dtos/create-asset-spec.dto';
import { UpdateAssetSpecDto } from './dtos/update-asset-spec.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetSpecDto: CreateAssetSpecDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.assetsService.create(userId, createAssetSpecDto);
  }

  @Get('specs')
  findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.assetsService.findAll(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetSpecDto: UpdateAssetSpecDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.assetsService.update(id, userId, updateAssetSpecDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.assetsService.remove(id, userId);
  }
}
