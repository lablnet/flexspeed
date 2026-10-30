import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

/** Exercise real SQLite queries while presenting the small D1 binding surface. */
export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(new URL('../../migrations/0001_auth_and_results.sql', import.meta.url), 'utf8'),
  );

  const prepare = (sql: string) => {
    let values: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first(column?: string) {
        const row = sqlite.prepare(sql).get(...(values as never[])) ?? null;
        return column && row ? row[column] : row;
      },
      async all() {
        return {
          success: true,
          results: sqlite.prepare(sql).all(...(values as never[])),
          meta: {},
        };
      },
      async run() {
        const result = sqlite.prepare(sql).run(...(values as never[]));
        return {
          success: true,
          results: [],
          meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
        };
      },
      async raw() {
        return sqlite
          .prepare(sql)
          .all(...(values as never[]))
          .map((row) => Object.values(row));
      },
    };
  };

  const db = {
    prepare,
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
    async batch(statements: { all(): Promise<unknown> }[]) {
      return Promise.all(statements.map((statement) => statement.all()));
    },
  } as unknown as D1Database;

  return { db, sqlite };
}
