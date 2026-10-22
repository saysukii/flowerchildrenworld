-- Shared Inside records so the directory, team, messages, forms, and emails
-- follow a signed-in person from one computer to another.

create table if not exists public.workspace_documents (
  id text primary key,
  document jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_documents enable row level security;
