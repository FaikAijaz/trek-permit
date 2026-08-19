const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  // Fails loudly at import time rather than every request quietly hitting
  // "undefined/auth/otp/request" — copy dashboard/.env.local.example to
  // dashboard/.env.local and fill it in.
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set. Copy dashboard/.env.local.example to dashboard/.env.local and fill it in.',
  );
}

/** Thrown for any non-2xx response. `reasons`/`unresolved` carry the
 * backend's structured 400/409 bodies (submit()'s "not ready" list,
 * issue()'s "unresolved participants" list) when present. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly reasons?: string[],
    public readonly unresolved?: { id: string; fullName: string; status: string }[],
  ) {
    super(message);
  }
}

let authToken: string | null = null;

/** Called by AuthContext on sign-in/sign-out/page-load rehydration. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
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
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  const hasBody =
    response.status !== 204 && response.headers.get('content-length') !== '0';
  const isJson = hasBody && response.headers.get('content-type')?.includes('application/json');
  const data: unknown = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const parsed = data as
      | {
          message?: string | string[];
          reasons?: string[];
          unresolved?: { id: string; fullName: string; status: string }[];
        }
      | undefined;
    const rawMessage = parsed?.message ?? `Request failed with status ${response.status}`;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    throw new ApiError(message, response.status, parsed?.reasons, parsed?.unresolved);
  }

  return data as T;
}

/** Multipart upload isn't needed by the dashboard — there's no upload
 * screen here — but viewing an already-uploaded document is, so
 * apiRequest's JSON-only assumption doesn't cover that one case.
 * apiRequestBlob() is the same auth/error handling, for a binary response. */
export async function apiRequestBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, { headers });

  if (!response.ok) {
    // Error responses are still JSON (Nest's default exception filter) —
    // read it as text->JSON.parse rather than assuming a body shape ahead
    // of time, since a genuine file response should never be parsed as JSON.
    let message = `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(await response.text()) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  return response.blob();
}
