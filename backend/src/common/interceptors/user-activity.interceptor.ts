import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class UserActivityInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user && user.sub) {
            // Fire and forget update to not block response
            this.updateUserActivity(user.sub).catch(err => console.error('Failed to update user activity', err));
        }

        return next.handle();
    }

    private async updateUserActivity(userId: string) {
        // Optimization: In a high scale app, we'd cache 'last_update_time' in Redis 
        // and only write to DB every X minutes. 
        // For now, we'll just write. Postgres handles it fine for this scale.
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: { lastActiveAt: new Date() }
            });
        } catch (e) {
            // Ignore if user not found or other transient errors
        }
    }
}
