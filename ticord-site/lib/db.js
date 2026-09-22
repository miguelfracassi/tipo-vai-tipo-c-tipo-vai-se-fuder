const { neon } = require("@neondatabase/serverless");

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;
let ready = null;

// Conecta ao Neon e cria as tabelas na primeira chamada (se ainda não existirem)
function db() {
  if (!sql) throw new Error("DATABASE_URL não configurada");
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists users (
        id serial primary key,
        first_name text not null,
        last_name text not null,
        email text not null unique,
        password_hash text not null,
        is_client boolean not null default false,
        created_at timestamptz not null default now()
      )`;
      await sql`create table if not exists sessions (
        token_hash text primary key,
        user_id integer not null references users(id) on delete cascade,
        expires_at timestamptz not null
      )`;
      await sql`create table if not exists plans (
        id serial primary key,
        user_id integer not null references users(id) on delete cascade,
        name text not null,
        started_at timestamptz not null,
        expires_at timestamptz not null,
        payment_id integer unique
      )`;
      await sql`create table if not exists payments (
        id serial primary key,
        user_id integer not null references users(id) on delete cascade,
        plan_id integer references plans(id) on delete set null,
        mp_id text unique,
        status text not null default 'pending',
        amount numeric(10,2) not null,
        qr_code text,
        qr_base64 text,
        created_at timestamptz not null default now(),
        paid_at timestamptz
      )`;
      await sql`alter table plans add column if not exists plan_key text not null default 'anual'`;
      await sql`alter table payments add column if not exists plan_key text not null default 'anual'`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready.then(() => sql);
}

module.exports = { db };
