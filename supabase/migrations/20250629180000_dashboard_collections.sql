-- Dashboard collections (achievements, goals, sessions, notifications, rewards, settings)

alter table public.app_state
  add column if not exists achievements jsonb not null default '[]'::jsonb,
  add column if not exists goals jsonb not null default '[]'::jsonb,
  add column if not exists study_sessions jsonb not null default '[]'::jsonb,
  add column if not exists notifications jsonb not null default '[]'::jsonb,
  add column if not exists rewards_catalog jsonb not null default '[]'::jsonb,
  add column if not exists reward_redemptions jsonb not null default '[]'::jsonb,
  add column if not exists platform_settings jsonb not null default '{}'::jsonb,
  add column if not exists audit_events jsonb not null default '[]'::jsonb;
