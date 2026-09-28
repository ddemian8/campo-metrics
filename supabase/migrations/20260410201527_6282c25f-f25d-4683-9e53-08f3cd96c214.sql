ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position_specific text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS position_specific text;