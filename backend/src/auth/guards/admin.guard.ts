import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAccessGuard } from './jwt-access.guard';

@Injectable()
export class AdminGuard extends JwtAccessGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @ts-ignore - The base AuthGuard's canActivate is a mixin method that may not be visible to TypeScript's static analysis, but it exists at runtime.
    const can = await super.canActivate(context);
    if (!can) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (user && user.role === 'ADMIN') {
      return true;
    }

    throw new ForbiddenException('You do not have permission to access this resource.');
  }
}
