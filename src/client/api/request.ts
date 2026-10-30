/** Shared transport. Leave successful bodies unread so measurements can stream them. */
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`/api/${path}`, { ...init, cache: 'no-store' });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response;
}

/** JSON endpoints use the same transport as streaming measurement endpoints. */
export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  return response.json() as Promise<T>;
}
