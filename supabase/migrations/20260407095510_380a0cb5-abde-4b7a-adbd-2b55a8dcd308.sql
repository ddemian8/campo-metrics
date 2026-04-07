
-- Create sessions table for GPS analysis submissions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  age_calculated INTEGER,
  height_cm INTEGER,
  weight_kg INTEGER,
  position TEXT,
  team_name TEXT,
  league TEXT,
  country TEXT,
  transfermarkt_url TEXT,
  transfermarkt_club TEXT,
  transfermarkt_league TEXT,
  session_type TEXT,
  md_day TEXT,
  opponent TEXT,
  session_date DATE,
  entry_method TEXT,
  duration TEXT,
  distance NUMERIC,
  acc_ev NUMERIC,
  dec_ev NUMERIC,
  dist_sp_z4 NUMERIC,
  dist_sp_z4plus NUMERIC,
  dist_sp_z5 NUMERIC,
  max_sp NUMERIC,
  av_sp NUMERIC,
  sp_ev NUMERIC,
  hmld NUMERIC,
  athlete_name TEXT,
  consent_public_profile BOOLEAN DEFAULT false,
  consent_leaderboard BOOLEAN DEFAULT false,
  consent_terms BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create players table for player profiles
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  age_calculated INTEGER,
  height_cm INTEGER,
  weight_kg INTEGER,
  position TEXT,
  team_name TEXT,
  league TEXT,
  country TEXT,
  transfermarkt_url TEXT,
  transfermarkt_club TEXT,
  transfermarkt_league TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert sessions (no auth required for MVP)
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read their own sessions" ON public.sessions FOR SELECT USING (true);

-- Allow anyone to insert players (no auth required for MVP)
CREATE POLICY "Anyone can create players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
