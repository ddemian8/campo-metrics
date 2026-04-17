-- ============================================================
-- FAZA 1: Club Platform schema (additive only — no DROP)
-- ============================================================

-- 1. Extend clubs table with new columns
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'football',
  ADD COLUMN IF NOT EXISTS country_id integer REFERENCES public.football_countries(id),
  ADD COLUMN IF NOT EXISTS league_id integer REFERENCES public.football_leagues(id),
  ADD COLUMN IF NOT EXISTS team_id integer REFERENCES public.football_teams(id),
  ADD COLUMN IF NOT EXISTS country_name text,
  ADD COLUMN IF NOT EXISTS league_name text,
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill trial_ends_at for any existing clubs that don't have one
UPDATE public.clubs
SET trial_ends_at = created_at + interval '30 days'
WHERE trial_ends_at IS NULL;

-- 2. club_players (roster)
CREATE TABLE IF NOT EXISTS public.club_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  pdf_name text NOT NULL,
  email text,
  position text,
  is_active boolean NOT NULL DEFAULT true,
  account_status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_players_club_id ON public.club_players(club_id);
CREATE INDEX IF NOT EXISTS idx_club_players_user_id ON public.club_players(user_id);
CREATE INDEX IF NOT EXISTS idx_club_players_pdf_name ON public.club_players(club_id, lower(pdf_name));

ALTER TABLE public.club_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owner full access on club_players"
ON public.club_players FOR ALL
USING (
  club_id IN (
    SELECT c.id FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  club_id IN (
    SELECT c.id FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Player can view own roster row"
ON public.club_players FOR SELECT
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. club_sessions (one per uploaded PDF)
CREATE TABLE IF NOT EXISTS public.club_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_name text NOT NULL,
  session_type text NOT NULL DEFAULT 'training',
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  opponent text,
  competition text,
  pdf_url text,
  players_detected integer NOT NULL DEFAULT 0,
  reports_generated integer NOT NULL DEFAULT 0,
  raw_pdf_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_sessions_club_id ON public.club_sessions(club_id, session_date DESC);

ALTER TABLE public.club_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owner full access on club_sessions"
ON public.club_sessions FOR ALL
USING (
  club_id IN (
    SELECT c.id FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  club_id IN (
    SELECT c.id FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
);

-- 4. club_reports (one per player per session)
CREATE TABLE IF NOT EXISTS public.club_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_session_id uuid NOT NULL REFERENCES public.club_sessions(id) ON DELETE CASCADE,
  club_player_id uuid NOT NULL REFERENCES public.club_players(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  report_data jsonb,
  cpi_score integer,
  raw_metrics jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_reports_club_id ON public.club_reports(club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_reports_session ON public.club_reports(club_session_id);
CREATE INDEX IF NOT EXISTS idx_club_reports_player ON public.club_reports(club_player_id, created_at DESC);

ALTER TABLE public.club_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owner full access on club_reports"
ON public.club_reports FOR ALL
USING (
  club_id IN (
    SELECT c.id FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  club_id IN (
    SELECT c.id FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Player can view own club_reports"
ON public.club_reports FOR SELECT
USING (
  club_player_id IN (
    SELECT cp.id FROM public.club_players cp
    JOIN public.profiles p ON p.id = cp.user_id
    WHERE p.user_id = auth.uid()
  )
);

-- 5. Storage bucket for club PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-pdfs', 'club-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Club owners can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'club-pdfs'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can read own folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'club-pdfs'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Club owners can delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'club-pdfs'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.clubs c
    JOIN public.profiles p ON p.id = c.admin_id
    WHERE p.user_id = auth.uid()
  )
);