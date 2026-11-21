import { Platform } from 'react-native';
import { secureStore } from '../lib/secureStore';
import type { ApiError } from './types';

function normalizeApiUrl(rawUrl: string | undefined): string {
  const fallback = 'https://receiptwise1.onrender.com/api/v1';
  const cleaned = (rawUrl || fallback).trim().replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned}/api/v1`;
}

const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
const IS_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

let refreshPromise: Promise<void> | null = null;

function toApiError(
  err: unknown,
  fallbackMessage: string,
  fallbackCode: string
): ApiError {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as Record<string, unknown>;
    return {
      message: String(e.message || fallbackMessage),
      code: String(e.code || fallbackCode),
      ...(typeof e.field === 'string' ? { field: e.field } : {}),
    };
  }
  return {
    message: err instanceof Error && err.message ? err.message : fallbackMessage,
    code: fallbackCode,
  };
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return {
      message:
        body?.detail ||
        body?.message ||
        body?.error ||
        `Request failed with status ${res.status}`,
      code: String(res.status),
      ...(body?.field ? { field: String(body.field) } : {}),
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

function sendMultipartWithXHR(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = timeoutMs;

    Object.entries(headers).forEach(([key, value]) => {
      // Never set Content-Type manually for multipart FormData; XHR sets boundary
      if (key.toLowerCase() !== 'content-type') {
        xhr.setRequestHeader(key, value);
      }
    });

    xhr.onload = () => {
      const responseHeaders = new Headers();
      const rawHeaders = xhr.getAllResponseHeaders() || '';
      rawHeaders
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            responseHeaders.append(
              line.slice(0, idx).trim(),
              line.slice(idx + 1).trim()
            );
          }
        });

      const bodyText =
        typeof xhr.responseText === 'string' ? xhr.responseText : '';

      resolve(
        new Response(bodyText, {
          status: xhr.status,
          statusText: xhr.statusText || '',
          headers: responseHeaders,
        })
      );
    };

    xhr.onerror = () => {
      reject({
        message: 'Upload network error on device',
        code: 'UPLOAD_NETWORK_ERROR',
      } satisfies ApiError);
    };

    xhr.ontimeout = () => {
      reject({
        message: `Receipt scan timed out after ${Math.round(timeoutMs / 1000)}s. Try a smaller image or retry.`,
        code: 'TIMEOUT',
      } satisfies ApiError);
    };

    xhr.send(formData as unknown as XMLHttpRequestBodyInit);
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
  networkCode: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw {
        message: timeoutMessage,
        code: 'TIMEOUT',
      } satisfies ApiError;
    }

    const rawMsg = String(err?.message || '');
    if (rawMsg.toLowerCase().includes('abort') && init.body instanceof FormData) {
      try {
        return await fetch(url, init);
      } catch (retryErr: any) {
        throw toApiError(
          retryErr,
          retryErr?.message || 'Upload network error on device',
          networkCode
        );
      }
    }

    throw toApiError(err, err?.message || 'Network request failed', networkCode);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runAuthorizedFetch<T>(
  path: string,
  performRequest: (token: string | null) => Promise<Response>,
  opts: {
    auth?: boolean;
    retryFn: () => Promise<T>;
  }
): Promise<T> {
  if (IS_DEMO_MODE) {
    throw {
      message: 'Demo mode is offline',
      code: 'DEMO_MODE',
    } satisfies ApiError;
  }

  const { auth = true, retryFn } = opts;
  const token = auth ? await secureStore.getAccessToken() : null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_URL}${normalizedPath}`;

  const res = await performRequest(token);

  if (res.status === 401 && auth) {
    const authError = await parseError(res);
    try {
      await refreshAccessToken();
      return await retryFn();
    } catch {
      await secureStore.clearTokens();
      throw authError;
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  baseUrl: API_URL,

  async request<T>(
    path: string,
    opts: RequestInit & { auth?: boolean } = {}
  ): Promise<T> {
    const { auth = true, ...fetchOpts } = opts;

    return runAuthorizedFetch<T>(
      path,
      (token) =>
        fetchWithTimeout(
          `${API_URL}${path.startsWith('/') ? path : `/${path}`}`,
          {
            ...fetchOpts,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(fetchOpts.headers || {}),
            },
          },
          20000,
          'Request timed out. The server may be waking up—please try again.',
          'NETWORK_ERROR'
        ),
      {
        auth,
        retryFn: () => api.request<T>(path, opts),
      }
    );
  },

  /**
   * Upload a file via multipart form data.
   * Uses XHR on native (Android/iOS) so React Native { uri, name, type } parts
   * are never rejected by expo/fetch's FormDataPart validation.
   */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    const timeoutMs = 60000;
    const timeoutMessage =
      'Receipt scan timed out after 60s. Try a smaller image or retry.';

    return runAuthorizedFetch<T>(
      path,
      (token) => {
        const headers: Record<string, string> = {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

        if (Platform.OS !== 'web') {
          return sendMultipartWithXHR(url, formData, headers, timeoutMs);
        }

        return fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers,
            body: formData,
          },
          timeoutMs,
          timeoutMessage,
          'UPLOAD_NETWORK_ERROR'
        );
      },
      {
        auth: true,
        retryFn: () => api.upload<T>(path, formData),
      }
    );
  },
};