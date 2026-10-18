-- Team messages the recipient can open from their own sign-in,
-- and the Google Drive grant for info@flowerchildren.world.

create table if not exists public.message_threads (
  id text primary key,
  participant_emails text[] not null,
  participant_names text[] not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.direct_messages (
  id text primary key,
  thread_id text not null references public.message_threads (id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  body text not null,
  mentions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_thread_id_idx on public.direct_messages (thread_id);

alter table public.message_threads enable row level security;
alter table public.direct_messages enable row level security;

create policy "Participants can read their threads"
  on public.message_threads for select
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = any (participant_emails));

create policy "Participants can create threads they belong to"
  on public.message_threads for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = any (participant_emails));

create policy "Participants can update their threads"
  on public.message_threads for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = any (participant_emails))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = any (participant_emails));

create policy "Participants can read messages in their threads"
  on public.direct_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.message_threads
      where message_threads.id = direct_messages.thread_id
        and lower(coalesce(auth.jwt() ->> 'email', '')) = any (message_threads.participant_emails)
    )
  );

create policy "Participants can send messages in their threads"
  on public.direct_messages for insert
  to authenticated
  with check (
    lower(sender_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and exists (
      select 1 from public.message_threads
      where message_threads.id = direct_messages.thread_id
        and lower(coalesce(auth.jwt() ->> 'email', '')) = any (message_threads.participant_emails)
    )
  );

create table if not exists public.workspace_google_connection (
  id text primary key default 'default',
  account_email text not null,
  access_token text not null,
  refresh_token text not null,
  access_expires_at timestamptz,
  root_folder_id text,
  community_folder_id text,
  brand_folder_id text,
  connected_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_google_connection enable row level security;
