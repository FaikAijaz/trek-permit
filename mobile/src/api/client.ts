const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  // Fails loudly at import time rather than every request quietly hitting
  // "undefined/auth/otp/request" — copy .env.example to .env and set this
  // machine's LAN IP (see that file for why "localhost" won't work here).
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env and fill it in.',
  );
}

/** Thrown for any non-2xx response. `reasons` carries the backend's
 * multi-reason validation arrays (e.g. submit()'s "not ready to submit"
 * list, or issue()'s "unresolved participants" list) when present. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly reasons?: string[],
  ) {
    super(message);
  }
}

let authToken: string | null = null;

/** Called by AuthContext on sign-in/sign-out/app-launch rehydration. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
    // Deliberately not setting Content-Type here — fetch fills in the
    // multipart boundary itself. Setting it by hand is a classic way to
    // silently break the upload.
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  // DELETE /applications/:id/participants/:id returns 204 with no body —
  // reading .json() on that would throw, so only parse when there's
  // actually something to parse.
  const hasBody =
    response.status !== 204 && response.headers.get('content-length') !== '0';
  const isJson = hasBody && response.headers.get('content-type')?.includes('application/json');
  const data: unknown = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const parsed = data as
      | { message?: string | string[]; reasons?: string[]; unresolved?: unknown[] }
      | undefined;
    const rawMessage = parsed?.message ?? `Request failed with status ${response.status}`;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    throw new ApiError(message, response.status, parsed?.reasons);
  }

  return data as T;
}
