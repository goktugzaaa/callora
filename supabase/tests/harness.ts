import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations");

// The pieces of a Supabase database our migrations rely on: the auth schema,
// auth.uid(), the API roles and Supabase's default grants on `public`.
const SUPABASE_STUB = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export type Db = PGlite;

/** Fresh in-memory Postgres with every migration applied. */
export async function createTestDb(): Promise<Db> {
  const db = await PGlite.create({ extensions: { btree_gist } });
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

export async function createUser(db: Db, email: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  return id;
}

/**
 * Runs `fn` as a signed-in user (role `authenticated`, auth.uid() = userId),
 * exactly how PostgREST executes requests carrying that user's JWT.
 * Pass `null` to run as the anonymous role.
 */
export async function asUser<T>(db: Db, userId: string | null, fn: (tx: Db) => Promise<T>): Promise<T> {
  await db.exec(userId ? "set role authenticated" : "set role anon");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  try {
    return await fn(db);
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Runs `fn` as the service role (the server), which bypasses RLS. */
export async function asService<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  await db.exec("set role service_role");
  try {
    return await fn(db);
  } finally {
    await db.exec("reset role");
  }
}

/** Resolves to the Postgres error code thrown by `promise`, or null if it succeeded. */
export async function pgErrorCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
}
