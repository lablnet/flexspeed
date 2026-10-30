-- Better Auth core schema. Google is the only enabled sign-in provider.
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user_idx ON "session"(userId);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS account_user_idx ON account(userId);
CREATE UNIQUE INDEX IF NOT EXISTS account_provider_idx ON account(providerId, accountId);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);

-- Results are retained indefinitely. User deletion only sets deleted_at.
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY NOT NULL,
  share_id TEXT NOT NULL UNIQUE,
  session_key TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  client_created_at TEXT NOT NULL,
  method_version TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('standard', 'lite')),
  metrics_json TEXT NOT NULL,
  samples_json TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  ip TEXT,
  network_json TEXT NOT NULL,
  client_json TEXT NOT NULL,
  user_agent TEXT,
  accept_language TEXT,
  poster_key TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS results_user_history_idx ON results(user_id, deleted_at, created_at DESC, id DESC);
