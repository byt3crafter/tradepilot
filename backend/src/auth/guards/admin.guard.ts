
import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAccessGuard } from './jwt-access.guard';

@Injectable()
export class AdminGuard extends JwtAccessGuard {
  // FIX: Made canActivate async and awaited the result from super.canActivate to correctly process the authentication logic.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // FIX: The expression `(super as any)` is invalid syntax and causes a compilation error.
    // The correct way to call the parent guard's logic is `super.canActivate(context)`.
    // This call is valid at runtime even if TypeScript reports a static type error due to NestJS's
    // mixin pattern. We suppress the type error with `@ts-ignore`.
    // @ts-ignore
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
