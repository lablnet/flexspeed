import { betterAuth } from 'better-auth';
import type { Env } from '../types';

export function authConfigured(env: Env): boolean {
  return Boolean(
    env.DB &&
    env.BETTER_AUTH_SECRET &&
    env.BETTER_AUTH_URL &&
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET,
  );
}

/** No password or email-verification flow: Google owns identity verification. */
export function createAuth(env: Env) {
  if (!authConfigured(env)) throw new Error('Google sign-in is not configured.');

  return betterAuth({
    database: env.DB!,
    secret: env.BETTER_AUTH_SECRET!,
    baseURL: env.BETTER_AUTH_URL!,
    basePath: '/api/auth',
    trustedOrigins: [new URL(env.BETTER_AUTH_URL!).origin],
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        prompt: 'select_account',
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: new URL(env.BETTER_AUTH_URL!).protocol === 'https:' },
  });
}

export async function currentUserId(request: Request, env: Env): Promise<string | null> {
  if (!authConfigured(env)) return null;
  const session = await createAuth(env).api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}
