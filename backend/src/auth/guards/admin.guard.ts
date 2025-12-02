import { Injectable, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { JwtAccessGuard } from './jwt-access.guard';

@Injectable()
export class AdminGuard extends JwtAccessGuard {
  private readonly logger = new Logger(AdminGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @ts-ignore - The base AuthGuard's canActivate is a mixin method that may not be visible to TypeScript's static analysis, but it exists at runtime.
    const can = await super.canActivate(context);
    if (!can) {
      this.logger.warn('JWT validation failed');
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.log(`AdminGuard checking user: ${JSON.stringify(user)}`);

    if (user && user.role === 'ADMIN') {
      this.logger.log(`✅ User ${user.sub} is ADMIN - access granted`);
      return true;
    }

    this.logger.warn(`❌ User ${user?.sub} has role: ${user?.role} - access denied`);
    throw new ForbiddenException('You do not have permission to access this resource.');
  }
}
