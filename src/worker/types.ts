export interface Env {
  ASSETS: Fetcher;
  SESSION_SECRET?: string;
  TEST_LIMITER?: RateLimit;
  DB?: D1Database;
  POSTERS?: R2Bucket;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export interface RouteContext {
  request: Request;
  url: URL;
  env: Env;
  execution?: ExecutionContext;
}

export interface ApiRoute {
  method: 'GET' | 'POST';
  path: string;
  public?: boolean;
  handle: (context: RouteContext) => Response | Promise<Response>;
}
