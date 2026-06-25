import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

@Controller('invites')
export class InvitesController {
    constructor(private invitesService: InvitesService) { }

    @Get('validate/:code')
    validate(@Param('code') code: string) {
        return this.invitesService.validateInvite(code);
    }

    @UseGuards(JwtAccessGuard)
    @Post('claim')
    claim(@Body('code') code: string, @Request() req) {
        // The JWT strategy returns { sub, email, role } — there is no `.id`.
        // Using req.user.id (undefined) silently broke every invite claim.
        return this.invitesService.claimInvite(code, req.user.sub);
    }
}
