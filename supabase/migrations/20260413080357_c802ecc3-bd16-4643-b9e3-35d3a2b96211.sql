
-- Backfill by updating reports to trigger recalculation
UPDATE public.reports SET updated_at = now() WHERE id IN (
  SELECT DISTINCT ON (player_id) id FROM reports ORDER BY player_id, created_at DESC
);
