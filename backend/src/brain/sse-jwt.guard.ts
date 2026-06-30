import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * SSE can't set Authorization headers (EventSource), so accept the Clerk JWT via `?token=`
 * and fold it into the header before the normal jwt-access strategy runs.
 *
 * SECURITY (N3): a JWT in a query string is a known leak vector — it can land in proxy/access
 * logs, browser history and Referer headers. We keep `?token=` because EventSource gives us no
 * other way to authenticate, but we MITIGATE:
 *   - Never log `req.url`, `req.query` or the token anywhere in the brain SSE path (verified).
 *   - We strip the token from `req.query` immediately after folding it into the Authorization
 *     header, so any downstream handler/interceptor that serializes `req.query` won't capture it.
 *     (Note: this can't scrub the raw request line that the upstream proxy / Nginx already logged
 *      before the request reached Node — that must be handled at the proxy log config.)
 * TODO: issue a dedicated short-TTL (e.g. 60s) single-purpose SSE token from a `GET /brain/sse-token`
 *       endpoint instead of forwarding the full-lifetime Clerk access token in the URL.
 */
@Injectable()
export class SseJwtGuard extends AuthGuard('jwt-access') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (req.query?.token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${req.query.token}`;
      // Remove from query so the raw token isn't carried into any later request-serializing logger.
      delete req.query.token;
    }
    return super.canActivate(context);
  }
}
