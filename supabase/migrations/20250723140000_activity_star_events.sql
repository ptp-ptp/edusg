-- Activity + star event ledgers for scientific subject insights

alter table public.app_state
  add column if not exists activity_events jsonb not null default '[]'::jsonb,
  add column if not exists star_events jsonb not null default '[]'::jsonb;
