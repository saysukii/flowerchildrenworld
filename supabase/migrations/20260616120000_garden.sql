-- Garden: notes (per user) and shared whiteboard

create table if not exists public.garden_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  body text not null default '',
  tag text not null default 'General' check (tag in ('Programming', 'Community', 'Brand', 'Fundraising', 'General')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete cascade
);

create index if not exists garden_notes_created_by_idx on public.garden_notes (created_by);
create index if not exists garden_notes_updated_at_idx on public.garden_notes (updated_at desc);

create table if not exists public.garden_whiteboard (
  id text primary key default 'shared',
  scene_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.garden_whiteboard (id, scene_data)
values ('shared', '{}'::jsonb)
on conflict (id) do nothing;

create or replace function public.set_garden_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists garden_notes_updated_at on public.garden_notes;
create trigger garden_notes_updated_at
  before update on public.garden_notes
  for each row execute function public.set_garden_updated_at();

drop trigger if exists garden_whiteboard_updated_at on public.garden_whiteboard;
create trigger garden_whiteboard_updated_at
  before update on public.garden_whiteboard
  for each row execute function public.set_garden_updated_at();

alter table public.garden_notes enable row level security;
alter table public.garden_whiteboard enable row level security;

create policy "Users can view own garden notes"
  on public.garden_notes for select
  using (auth.uid() = created_by);

create policy "Users can insert own garden notes"
  on public.garden_notes for insert
  with check (auth.uid() = created_by);

create policy "Users can update own garden notes"
  on public.garden_notes for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Users can delete own garden notes"
  on public.garden_notes for delete
  using (auth.uid() = created_by);

create policy "Authenticated users can view shared whiteboard"
  on public.garden_whiteboard for select
  to authenticated
  using (true);

create policy "Authenticated users can update shared whiteboard"
  on public.garden_whiteboard for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can insert shared whiteboard"
  on public.garden_whiteboard for insert
  to authenticated
  with check (id = 'shared');
