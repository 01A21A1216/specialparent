import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE_NAME = 'sp_access';
export const REFRESH_COOKIE_NAME = 'sp_refresh';

// Cookie config used on all auth responses.
// - httpOnly: JS can't read them → mitigates XSS token theft
// - secure: HTTPS-only in production; false on localhost (http)
// - sameSite: 'lax' allows the browser to send the cookie on same-site
//   navigations and top-level GETs, but not on cross-site XHR. Prevents
//   most CSRF on browser navigations while keeping the SPA usable.
// - path: '/api' — cookies only sent to the API, not to the marketing pages
function base(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const accessTtl = parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10);
  const refreshTtl = parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10);
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...base(),
    maxAge: accessTtl * 1000,
  });
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...base(),
    maxAge: refreshTtl * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, base());
  res.clearCookie(REFRESH_COOKIE_NAME, base());
}
