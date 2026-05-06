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
    role: 'PARENT' | 'THERAPIST' | 'TEACHER' | 'SCHOOL_ADMIN' | 'ADMIN';
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

async function refreshAccess(): Promise<string> {
  if (refreshing) return refreshing;
  const rt = getRefreshToken();
  if (!rt) throw new ApiError(401, 'No refresh token');
  refreshing = (async () => {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      clearTokens();
      throw new ApiError(res.status, 'Refresh failed');
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
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

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
