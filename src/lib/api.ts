/**
 * One place that knows how to talk to the backend.
 *
 * Every call goes through here so the token header and the error shape are
 * handled once rather than in every component.
 */

const TOKEN_KEY = 'spenza.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Thrown for any non-2xx response, carrying the backend's message. */
export class ApiError extends Error {
  // Declared and assigned explicitly rather than as a constructor parameter
  // property: Vite's tsconfig sets erasableSyntaxOnly, which rejects the
  // shorthand because it emits real code instead of being purely a type.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // The backend sends `message` as either a string or an array of
    // per-field validation messages. Flatten both into one line.
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Request failed');
    throw new ApiError(message, response.status);
  }

  return body as T;
}
