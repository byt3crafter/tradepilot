import { Controller, Get, UseGuards, Patch, Param, Body, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GrantProDto } from './dtos/grant-pro.dto';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}