export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const configuredApiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
    : '';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const endpoint = configuredApiBase
    ? `${configuredApiBase}${path.startsWith('/api') ? path : `/api${path}`}`
    : `/api${path}`;

  const response = await fetch(endpoint, {
    ...init,
    credentials: 'include',
    headers: {
      'X-Requested-With': 'KontentX-Web',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function isStaticHostFallbackError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError) {
    const hasServerJsonError =
      error.details !== null &&
      typeof error.details === 'object' &&
      'error' in (error.details as Record<string, unknown>);
    if (!hasServerJsonError && [404, 405, 500, 502, 503, 504].includes(error.status)) {
      return true;
    }
  }
  return false;
}
