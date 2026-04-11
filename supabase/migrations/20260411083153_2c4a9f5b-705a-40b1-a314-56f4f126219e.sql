ALTER TABLE public.player_stats_aggregate
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_session_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screenshot_session_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_session_count integer NOT NULL DEFAULT 0;