import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class InvitesService {
    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
    ) { }

    async validateInvite(code: string) {
        const invite = await this.prisma.inviteCode.findUnique({
            where: { code },
        });

        if (!invite) {
            throw new NotFoundException('Invite code not found');
        }

        if (invite.isUsed) {
            throw new BadRequestException('Invite code has already been used');
        }

        if (invite.expiresAt && new Date() > invite.expiresAt) {
            throw new BadRequestException('Invite code has expired');
        }

        return {
            valid: true,
            type: invite.type,
            duration: invite.duration,
        };
    }

    async claimInvite(code: string, userId: string) {
        const invite = await this.prisma.inviteCode.findUnique({
            where: { code },
        });

        if (!invite || invite.isUsed) {
            throw new BadRequestException('Invalid or used invite code');
        }

        // Apply reward
        if (invite.type === 'LIFETIME') {
            await this.usersService.setLifetimeAccess(userId, true);
        } else if (invite.type === 'TRIAL' && invite.duration) {
            await this.usersService.extendTrial(userId, invite.duration);
        }

        // Mark as used
        await this.prisma.inviteCode.update({
            where: { id: invite.id },
            data: {
                isUsed: true,
                usedByUserId: userId,
            },
        });

        return { success: true };
    }
}
