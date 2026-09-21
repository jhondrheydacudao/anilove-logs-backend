create extension if not exists pgcrypto;

create table if not exists public.anilove_auth_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  display_name text not null,
  password_hash text not null,
  email_verified_at timestamptz,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in_at timestamptz,
  deleted_at timestamptz
);

create unique index if not exists anilove_auth_users_email_key
  on public.anilove_auth_users (lower(email)) where deleted_at is null;
create unique index if not exists anilove_auth_users_username_key
  on public.anilove_auth_users (lower(username)) where deleted_at is null;

create table if not exists public.anilove_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anilove_auth_users(id) on delete cascade,
  refresh_token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  ip_address text
);
create index if not exists anilove_auth_sessions_user_idx
  on public.anilove_auth_sessions (user_id, expires_at desc);

create table if not exists public.anilove_auth_email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anilove_auth_users(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('verify_email', 'reset_password')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists anilove_auth_email_tokens_user_idx
  on public.anilove_auth_email_tokens (user_id, purpose, expires_at desc);
