import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { BrokerAccountsService } from './broker-accounts.service';
import { CreateBrokerAccountDto } from './dtos/create-broker-account.dto';
import { UpdateBrokerAccountDto } from './dtos/update-broker-account.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('broker-accounts')
export class BrokerAccountsController {
  constructor(private readonly brokerAccountsService: BrokerAccountsService) {}

  @Post()
  create(@Body() createBrokerAccountDto: CreateBrokerAccountDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.create(userId, createBrokerAccountDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.findOne(id, userId);
  }

  @Get(':id/objectives')
  getObjectivesProgress(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.getObjectivesProgress(id, userId);
  }
  
  @Get(':id/smart-limits-progress')
  getSmartLimitsProgress(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.getSmartLimitsProgress(id, userId);
  }

  @Post(':id/weekly-debrief')
  @HttpCode(HttpStatus.OK)
  generateWeeklyDebrief(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.generateWeeklyDebrief(id, userId);
  }

  @Post(':id/daily-debrief')
  @HttpCode(HttpStatus.OK)
  generateDailyDebrief(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.generateDailyDebrief(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBrokerAccountDto: UpdateBrokerAccountDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.update(id, userId, updateBrokerAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.brokerAccountsService.remove(id, userId);
  }
}