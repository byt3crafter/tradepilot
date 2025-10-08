import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { UserDto } from './dtos/user.dto';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

// Define a type for Express request objects augmented by Passport
interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
    ) {}

    @UseGuards(JwtAccessGuard)
    @Get('me')
    async getMe(@Req() req: AuthenticatedRequest) {
        const userId = req.user.sub;
        const user = await this.usersService.findById(userId);

        const featureFlags = {
            analysisTrackerEnabled: this.configService.get<boolean>('ANALYSIS_TRACKER_ENABLED'),
        };

        const userDto = plainToInstance(UserDto, user, {
            excludeExtraneousValues: true,
        });

        return { ...userDto, featureFlags };
    }
}
