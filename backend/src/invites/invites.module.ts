import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [PrismaModule, UsersModule],
    controllers: [InvitesController],
    providers: [InvitesService],
})
export class InvitesModule { }
