import { request } from '../api/request';

/** Own measurement tokens and deadlines; delegate HTTP handling to the shared transport. */
export class MeasurementClient {
  private token = '';

  constructor(private signal: AbortSignal) {}

  get sessionToken(): string {
    return this.token;
  }

  async connect(): Promise<void> {
    const response = await this.request('session', { method: 'POST' });
    this.token = ((await response.json()) as { token: string }).token;
  }

  async request(path: string, init: RequestInit = {}, timeout = 12_000): Promise<Response> {
    const signals = [this.signal, AbortSignal.timeout(timeout)];
    if (init.signal) signals.push(init.signal);

    const headers = new Headers(init.headers);
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);

    return request(path, {
      ...init,
      headers,
      signal: AbortSignal.any(signals),
    });
  }
}
