import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * SSE can't set Authorization headers (EventSource), so accept the Clerk JWT via `?token=`
 * and fold it into the header before the normal jwt-access strategy runs.
 */
@Injectable()
export class SseJwtGuard extends AuthGuard('jwt-access') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (req.query?.token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    return super.canActivate(context);
  }
}
