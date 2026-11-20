import { secureStore } from '../lib/secureStore';
import type { ApiError } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
// In demo mode every API module uses its local fallback data. Do not wait for
// an unreachable server before falling back — this keeps navigation instant.
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...fetchOpts,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(fetchOpts.headers || {}),
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401 && auth) {
      try {
        await refreshAccessToken();
        // Retry once with new token
        return api.request(path, opts);
      } catch {
        // Refresh also failed — clear tokens (will redirect to login)
        await secureStore.clearTokens();
        throw await parseError(res);
      }
    }

    if (!res.ok) {
      throw await parseError(res);
    }

    // Handle 204 No Content
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

    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type — let fetch set it with boundary
      },
      body: formData,
    });

    if (res.status === 401) {
      await refreshAccessToken();
      return api.upload(path, formData);
    }

    if (!res.ok) throw await parseError(res);
    return res.json();
  },
};
