/**
 * subdomain.ts — hostname-based surface detection for the JTradePilot SPA.
 *
 * The same built SPA is served by Caddy on three subdomains. This module
 * inspects window.location.hostname at runtime and returns which "surface"
 * should be rendered so that App.tsx can branch accordingly.
 *
 * Surfaces:
 *   landing  — jtradepilot.com / www.jtradepilot.com  (public marketing only)
 *   app      — app.jtradepilot.com                    (authenticated client app)
 *   ops      — ops.jtradepilot.com                    (admin panel, ADMIN role only)
 *   dev      — localhost / 127.0.0.1 / any other host  (full app, current dev behavior)
 */

export const MARKETING_URL = 'https://jtradepilot.com';
export const APP_URL = 'https://app.jtradepilot.com';
export const OPS_URL = 'https://ops.jtradepilot.com';

export type Surface = 'landing' | 'app' | 'ops' | 'dev';

/**
 * Determine which surface to render based on the current hostname.
 * Called once at module evaluation time so the result is stable for the
 * lifetime of the page.
 */
export function getSurface(): Surface {
  const { hostname } = window.location;
  if (hostname === 'app.jtradepilot.com') return 'app';
  if (hostname === 'ops.jtradepilot.com') return 'ops';
  if (hostname === 'jtradepilot.com' || hostname === 'www.jtradepilot.com') return 'landing';
  // localhost, 127.0.0.1, staging previews, CI — full dev behavior
  return 'dev';
}

/**
 * Hard-navigate the browser to the app. subdomain.
 * Use for redirecting from the landing or ops surface.
 */
export function redirectToApp(path = '/'): void {
  window.location.href = `${APP_URL}${path}`;
}

/**
 * Hard-navigate the browser to the marketing apex domain.
 */
export function redirectToMarketing(path = '/'): void {
  window.location.href = `${MARKETING_URL}${path}`;
}
