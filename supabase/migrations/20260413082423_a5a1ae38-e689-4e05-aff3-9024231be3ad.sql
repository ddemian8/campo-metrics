
-- Add unique constraints for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_progress_type_name ON public.sync_progress(sync_type, entity_name) WHERE entity_name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_progress_type_id ON public.sync_progress(sync_type, entity_id) WHERE entity_id IS NOT NULL;
ALTER TABLE public.football_countries ADD CONSTRAINT football_countries_name_key UNIQUE (name);
