import { fetch as expoFetch } from 'expo/fetch';

import { env } from './env';
import { tokenStorage } from './token-storage';

const BASE_URL = env.apiUrl;
const REFRESH_URL = env.authRefreshUrl;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

const fetchFn = typeof expoFetch === 'function' ? expoFetch : fetch;

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return false;
    }
    const decoded = JSON.parse(atob(payload));
    if (!decoded?.exp) {
      return false;
    }
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return false;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!REFRESH_URL || !refreshToken) {
    return null;
  }

  const response = await fetchFn(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await tokenStorage.clearAll();
    return null;
  }

  const data = await response.json();
  const accessToken = data?.accessToken ?? data?.token;
  if (typeof accessToken !== 'string') {
    return null;
  }

  await tokenStorage.setToken(accessToken);
  if (data?.refreshToken) {
    await tokenStorage.setRefreshToken(data.refreshToken);
  }
  return accessToken;
}

async function getValidToken(): Promise<string | null> {
  const token = await tokenStorage.getToken();
  if (token && !isTokenExpired(token)) {
    return token;
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = attemptTokenRefresh().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  }

  return refreshPromise ?? null;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    body,
    headers: customHeaders,
    skipAuth = false,
    ...restOptions
  } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(customHeaders ?? {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      serializedBody = body;
    } else {
      headers.set('Content-Type', 'application/json');
      serializedBody = JSON.stringify(body);
    }
  }

  if (!skipAuth && !headers.has('Authorization')) {
    const token = await getValidToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetchFn(url, {
      ...restOptions,
      headers,
      body: serializedBody,
    });

    if (!response.ok) {
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        try {
          errorData = await response.text();
        } catch {
          errorData = null;
        }
      }

      const message =
        (typeof errorData === 'object' &&
          errorData !== null &&
          'message' in errorData
          ? String(errorData.message)
          : undefined) ||
        (typeof errorData === 'string' ? errorData : undefined) ||
        `Request failed with status ${response.status}`;

      const code =
        typeof errorData === 'object' && errorData !== null && 'code' in errorData
          ? String(errorData.code)
          : undefined;

      throw new ApiError(message, response.status, code, errorData);
    }

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      'NETWORK_ERROR',
      error
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};