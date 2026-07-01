-- EduSG initial schema (document store matching local database.json shape)

create table if not exists public.app_state (
  id text primary key default 'main',
  users jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- API uses service role key; block anonymous direct access for now
create policy "service role only"
  on public.app_state
  for all
  using (false)
  with check (false);

-- Public bucket for question diagram uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-assets',
  'question-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read question assets"
  on storage.objects for select
  using (bucket_id = 'question-assets');

create policy "service upload question assets"
  on storage.objects for insert
  with check (bucket_id = 'question-assets');

create policy "service update question assets"
  on storage.objects for update
  using (bucket_id = 'question-assets');

create policy "service delete question assets"
  on storage.objects for delete
  using (bucket_id = 'question-assets');

-- Profiles table for future Supabase Auth integration
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_user_id text unique,
  role text not null check (role in ('student', 'parent', 'admin')),
  name text not null,
  grade text,
  avatar text,
  linked_student_id text,
  linked_parent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);
