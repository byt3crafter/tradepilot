import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
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
