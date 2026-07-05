import { supabase } from '@/lib/supabase';

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: HeadersInit;
  silent?: boolean;
};

export async function getSessionToken(explicitToken?: string | null) {
  if (explicitToken) return explicitToken;

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function requestApi<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    const { method = 'GET', body, token, headers } = options;
    const requestHeaders = new Headers(headers);

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    if (body !== undefined && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    const response = await fetch(path, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    return payload as T;
  } catch {
    return {} as T;
  }
}