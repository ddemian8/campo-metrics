
-- Football Countries
CREATE TABLE IF NOT EXISTS public.football_countries (
  id integer PRIMARY KEY,
  name text NOT NULL,
  code text,
  flag_url text,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.football_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read football_countries" ON public.football_countries FOR SELECT USING (true);
CREATE POLICY "Admins can insert football_countries" ON public.football_countries FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update football_countries" ON public.football_countries FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete football_countries" ON public.football_countries FOR DELETE TO authenticated USING (public.is_admin());

-- Football Leagues
CREATE TABLE IF NOT EXISTS public.football_leagues (
  id integer PRIMARY KEY,
  name text NOT NULL,
  country_id integer REFERENCES public.football_countries(id) ON DELETE CASCADE,
  logo_url text,
  type text DEFAULT 'league',
  season integer DEFAULT 2025,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.football_leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read football_leagues" ON public.football_leagues FOR SELECT USING (true);
CREATE POLICY "Admins can insert football_leagues" ON public.football_leagues FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update football_leagues" ON public.football_leagues FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete football_leagues" ON public.football_leagues FOR DELETE TO authenticated USING (public.is_admin());

-- Football Teams
CREATE TABLE IF NOT EXISTS public.football_teams (
  id integer PRIMARY KEY,
  name text NOT NULL,
  league_id integer REFERENCES public.football_leagues(id) ON DELETE CASCADE,
  country_id integer REFERENCES public.football_countries(id) ON DELETE CASCADE,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.football_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read football_teams" ON public.football_teams FOR SELECT USING (true);
CREATE POLICY "Admins can insert football_teams" ON public.football_teams FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update football_teams" ON public.football_teams FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete football_teams" ON public.football_teams FOR DELETE TO authenticated USING (public.is_admin());

-- Sync progress tracking
CREATE TABLE IF NOT EXISTS public.sync_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL, -- 'countries', 'leagues', 'teams'
  entity_id integer, -- country_id or league_id being processed
  entity_name text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'done'
  requests_used integer NOT NULL DEFAULT 0,
  items_synced integer NOT NULL DEFAULT 0,
  synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sync_progress" ON public.sync_progress FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Anyone can read sync_progress" ON public.sync_progress FOR SELECT USING (true);

-- Add ID columns to profiles for structured filtering
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='country_id') THEN
    ALTER TABLE public.profiles ADD COLUMN country_id integer REFERENCES public.football_countries(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='league_id') THEN
    ALTER TABLE public.profiles ADD COLUMN league_id integer REFERENCES public.football_leagues(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='team_id') THEN
    ALTER TABLE public.profiles ADD COLUMN team_id integer REFERENCES public.football_teams(id);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_football_leagues_country ON public.football_leagues(country_id);
CREATE INDEX IF NOT EXISTS idx_football_teams_league ON public.football_teams(league_id);
CREATE INDEX IF NOT EXISTS idx_football_teams_country ON public.football_teams(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON public.profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_league_id ON public.profiles(league_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
