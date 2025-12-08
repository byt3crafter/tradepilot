import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

@Controller('promo-codes')
export class PromoCodesController {
    constructor(private promoCodesService: PromoCodesService) { }

    @UseGuards(AdminGuard)
    @Post()
    create(@Body() body: any) {
        return this.promoCodesService.create(body);
    }

    @UseGuards(AdminGuard)
    @Get()
    findAll() {
        return this.promoCodesService.findAll();
    }

    @UseGuards(AdminGuard)
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.promoCodesService.delete(id);
    }

    @UseGuards(JwtAccessGuard)
    @Post('validate')
    validate(@Body('code') code: string) {
        return this.promoCodesService.validate(code);
    }
}
