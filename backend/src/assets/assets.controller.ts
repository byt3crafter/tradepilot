import { Controller, Get, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

@UseGuards(JwtAccessGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('specs')
  getSpecifications() {
    return this.assetsService.getSpecifications();
  }
}
