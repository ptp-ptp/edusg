-- Extend app_state for auth events and analytics

alter table public.app_state
  add column if not exists login_events jsonb not null default '[]'::jsonb,
  add column if not exists answer_events jsonb not null default '[]'::jsonb;

-- Normalized tables for future migration off document store

create table if not exists public.app_users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('student', 'parent', 'admin')),
  name text not null,
  grade text,
  avatar text,
  linked_student_id text,
  linked_parent_id text,
  stars integer default 0,
  streak integer default 0,
  login_count integer not null default 0,
  last_login_at timestamptz,
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.login_events (
  id text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  method text not null default 'password',
  created_at timestamptz not null default now()
);

create index if not exists login_events_user_id_idx on public.login_events(user_id);
create index if not exists login_events_created_at_idx on public.login_events(created_at desc);

create table if not exists public.answer_events (
  id text primary key,
  student_id text not null references public.app_users(id) on delete cascade,
  question_id text,
  subject text not null,
  topic text,
  level integer,
  difficulty text,
  correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists answer_events_student_id_idx on public.answer_events(student_id);
create index if not exists answer_events_created_at_idx on public.answer_events(created_at desc);

alter table public.app_users enable row level security;
alter table public.login_events enable row level security;
alter table public.answer_events enable row level security;
