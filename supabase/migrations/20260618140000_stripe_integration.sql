-- Stripe Connect OAuth — workspace connection + short-lived OAuth state

create table if not exists public.workspace_stripe_connection (
  id text primary key default 'default',
  stripe_user_id text not null,
  access_token text not null,
  refresh_token text,
  account_name text not null default '',
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists stripe_oauth_states_expires_at_idx
  on public.stripe_oauth_states (expires_at);

alter table public.workspace_stripe_connection enable row level security;
alter table public.stripe_oauth_states enable row level security;
