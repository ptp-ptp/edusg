-- Admin-managed Chinese vocabulary / groups (overrides only; seed JSON ships in app bundle)

alter table public.app_state
  add column if not exists chinese_content jsonb not null default '{"packs":{},"p1TopicClusters":null}'::jsonb;
