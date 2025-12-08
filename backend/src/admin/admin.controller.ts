import { Controller, Get, UseGuards, Patch, Param, Body, Delete, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GrantProDto } from './dtos/grant-pro.dto';
import { CreatePropFirmTemplateDto } from './dtos/create-prop-firm-template.dto';
import { UpdatePropFirmTemplateDto } from './dtos/update-prop-firm-template.dto';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/grant-pro')
  grantProAccess(@Param('id') id: string, @Body() grantProDto: GrantProDto) {
    return this.adminService.grantProAccess(id, grantProDto);
  }

  @Delete('users/:id/grant-pro')
  @HttpCode(HttpStatus.OK)
  revokeProAccess(@Param('id') id: string) {
    return this.adminService.revokeProAccess(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('referrals/stats')
  getReferralStats() {
    return this.adminService.getReferralStats();
  }

  @Post('users/:id/lifetime')
  grantLifetimeAccess(@Param('id') id: string) {
    return this.adminService.grantLifetimeAccess(id);
  }

  @Post('users/:id/extend-trial')
  extendTrial(@Param('id') userId: string, @Body('days') days: number) {
    return this.adminService.extendTrial(userId, days);
  }

  @Post('invites/generate')
  generateInvite(@Body() body: { type: 'TRIAL' | 'LIFETIME'; duration?: number }) {
    return this.adminService.generateInvite(body.type, body.duration);
  }

  @Get('invites')
  getInvites() {
    return this.adminService.getInvites();
  }

  // Prop Firm Templates Endpoints
  @Get('templates')
  getAllTemplates() {
    return this.adminService.getAllTemplates();
  }

  @Get('templates/:id')
  getTemplateById(@Param('id') id: string) {
    return this.adminService.getTemplateById(id);
  }

  @Post('templates')
  createTemplate(@Body() createDto: CreatePropFirmTemplateDto) {
    return this.adminService.createTemplate(createDto);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() updateDto: UpdatePropFirmTemplateDto) {
    return this.adminService.updateTemplate(id, updateDto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  deleteTemplate(@Param('id') id: string) {
    return this.adminService.deleteTemplate(id);
  }
}