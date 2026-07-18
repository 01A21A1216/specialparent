// Lightweight API client. Stores tokens in localStorage (acceptable for an MVP;
// for production move to httpOnly cookies set by the backend).

const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    : window.location.origin.includes('localhost')
      ? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
      : '';

const ACCESS_KEY = 'sp_access';
const REFRESH_KEY = 'sp_refresh';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'PARENT' | 'THERAPIST' | 'DOCTOR' | 'TEACHER' | 'SPECIAL_EDUCATOR' | 'SCHOOL_ADMIN' | 'ADMIN';
    preferredLanguage: string;
    avatarUrl?: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let refreshing: Promise<string> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  const rt = getRefreshToken();
  refreshing = (async () => {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      // Send the sp_refresh cookie automatically; body only used if the
      // caller has a legacy localStorage token.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: rt ? JSON.stringify({ refreshToken: rt }) : '{}',
    });
    if (!res.ok) {
      clearTokens();
      throw new ApiError(res.status, 'Refresh failed');
    }
    const data = await res.json();
    // Cookies are set by the backend; keep localStorage in sync as a
    // fallback for older sessions still using Authorization headers.
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
    }
    return (data.accessToken as string) ?? null;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // attach bearer token; default true
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;
  const url = `${API_BASE}/api${path}`;

  // FormData bodies (file uploads) must NOT be JSON-serialized and must NOT
  // carry a Content-Type header — the browser sets the multipart boundary.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    // Legacy: Authorization header still supported by backend as a fallback.
    // Primary path is now the sp_access httpOnly cookie which the browser
    // sends automatically because of credentials:'include' below.
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, {
      method,
      headers,
      credentials: 'include',
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
      signal,
    });
  };

  let token = auth ? getAccessToken() : null;
  let res = await doFetch(token);

  // attempt single refresh on 401
  if (auth && res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAccess();
      res = await doFetch(token);
    } catch {
      // fall through; throw below
    }
  }

  if (!res.ok) {
    let payload: unknown = undefined;
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    const msg =
      (payload as any)?.message ??
      (Array.isArray((payload as any)?.message) ? (payload as any).message.join(', ') : null) ??
      res.statusText ??
      'Request failed';
    throw new ApiError(res.status, msg, payload);
  }

  // 204
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Authed binary download. Returns the raw Blob so callers can view or save it.
export async function apiDownload(path: string): Promise<Blob> {
  const url = `${API_BASE}/api${path}`;
  let token = getAccessToken();
  const doFetch = (t: string | null) =>
    fetch(url, {
      method: 'GET',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
  let res = await doFetch(token);
  if (res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAccess();
      res = await doFetch(token);
    } catch {
      /* fall through */
    }
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText || 'Download failed');
  return res.blob();
}

// ── Convenience auth methods ────────────────────────────
export const authApi = {
  signup: (data: {
    email: string;
    fullName: string;
    password: string;
    role?: string;
    preferredLanguage?: string;
  }) => api<AuthResult>('/auth/signup', { method: 'POST', body: data, auth: false }),

  login: (data: { email: string; password: string }) =>
    api<AuthResult>('/auth/login', { method: 'POST', body: data, auth: false }),

  logout: () => {
    const rt = getRefreshToken();
    if (!rt) return Promise.resolve();
    return api('/auth/logout', { method: 'POST', body: { refreshToken: rt }, auth: false }).finally(
      clearTokens,
    );
  },

  me: () => api<AuthResult['user']>('/auth/me'),
};
