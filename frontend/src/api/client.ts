import { secureStore } from '../lib/secureStore';
import type { ApiError } from './types';

function normalizeApiUrl(rawUrl: string | undefined): string {
  const fallback = 'http://localhost:8000/api/v1';
  const cleaned = (rawUrl || fallback).trim().replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned}/api/v1`;
}

const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
const IS_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

// Single-flight refresh: concurrent 401s wait on one refresh promise
let refreshPromise: Promise<void> | null = null;

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return {
      message: body.detail || body.message || `Request failed with status ${res.status}`,
      code: String(res.status),
      field: body.field,
    };
  } catch {
    return {
      message: `Request failed with status ${res.status}`,
      code: String(res.status),
    };
  }
}

async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = await secureStore.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data = await res.json();
      await secureStore.setTokens(data.access_token, data.refresh_token);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const api = {
  baseUrl: API_URL,

  async request<T>(
    path: string,
    opts: RequestInit & { auth?: boolean } = {}
  ): Promise<T> {
    if (IS_DEMO_MODE) {
      throw new Error('Demo mode is offline');
    }

    const { auth = true, ...fetchOpts } = opts;
    const token = auth ? await secureStore.getAccessToken() : null;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let res: Response;
    try {
      res = await fetch(`${API_URL}${normalizedPath}`, {
        ...fetchOpts,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(fetchOpts.headers || {}),
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw {
          message: 'Request timed out. The server may be waking up—please try again.',
          code: 'TIMEOUT',
        } satisfies ApiError;
      }
      throw {
        message: err?.message || 'Network request failed',
        code: 'NETWORK_ERROR',
      } satisfies ApiError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401 && auth) {
      try {
        await refreshAccessToken();
        return api.request<T>(path, opts);
      } catch {
        await secureStore.clearTokens();
        throw await parseError(res);
      }
    }

    if (!res.ok) {
      throw await parseError(res);
    }

    if (res.status === 204) return undefined as T;

    return res.json();
  },

  /**
   * Upload a file via multipart form data.
   */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    if (IS_DEMO_MODE) {
      throw new Error('Demo mode is offline');
    }

    const token = await secureStore.getAccessToken();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let res: Response;
    try {
      res = await fetch(`${API_URL}${normalizedPath}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Do not set Content-Type manually so React Native/Web sets the multipart boundary
        },
        body: formData,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw {
          message: 'Receipt scan timed out after 60s. Try a smaller image or retry.',
          code: 'TIMEOUT',
        } satisfies ApiError;
      }
      throw {
        message: err?.message || 'Upload network error on device',
        code: 'UPLOAD_NETWORK_ERROR',
      } satisfies ApiError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401) {
      try {
        await refreshAccessToken();
        return api.upload<T>(path, formData);
      } catch {
        await secureStore.clearTokens();
        throw await parseError(res);
      }
    }

    if (!res.ok) {
      throw await parseError(res);
    }

    return res.json();
  },
};