
-- Drop existing tables that will be replaced
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  date_of_birth DATE,
  height_cm INTEGER,
  weight_kg NUMERIC(5,1),
  position TEXT CHECK (position IN ('GK','DEF','MID','FWD')),
  preferred_foot TEXT CHECK (preferred_foot IN ('left','right','both')),
  current_club TEXT,
  current_league TEXT,
  country TEXT,
  transfermarkt_url TEXT,
  account_type TEXT NOT NULL DEFAULT 'free' CHECK (account_type IN ('free','player_pro','club_admin','club_member')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  reports_used_this_month INTEGER NOT NULL DEFAULT 0,
  reports_reset_date TIMESTAMPTZ,
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none','active','past_due','cancelled')),
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free','player_pro','club')),
  affiliate_code TEXT UNIQUE,
  referred_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are visible to everyone" ON public.profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- 2. clubs
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  country TEXT,
  league TEXT,
  city TEXT,
  website TEXT,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none','active','past_due','cancelled')),
  max_players INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubs are publicly visible" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Club admin can update" ON public.clubs FOR UPDATE USING (admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated users can create clubs" ON public.clubs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. club_members
CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','coach','staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, player_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members are publicly visible" ON public.club_members FOR SELECT USING (true);
CREATE POLICY "Club admin can insert members" ON public.club_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND admin_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()))
);
CREATE POLICY "Club admin can delete members" ON public.club_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND admin_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()))
);

-- 4. sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('match','training')),
  session_date DATE NOT NULL,
  training_day TEXT CHECK (training_day IN ('MD-3','MD-2','MD-1','MD0','MD+1','MD+2','MD+3')),
  opponent TEXT,
  competition TEXT,
  minutes_played INTEGER,
  input_method TEXT CHECK (input_method IN ('pdf_upload','screenshot','manual')),
  uploaded_file_url TEXT,
  gps_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (
  player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Club staff can view member sessions" ON public.sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.player_id = public.sessions.player_id
    AND c.admin_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  )
);
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (
  player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 5. reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ai_report JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  model_used TEXT,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (
  player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public reports are visible" ON public.reports FOR SELECT USING (is_public = true);
CREATE POLICY "Club staff can view member reports" ON public.reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.player_id = public.reports.player_id
    AND c.admin_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  )
);
CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT WITH CHECK (
  player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 6. player_stats_aggregate
CREATE TABLE public.player_stats_aggregate (
  player_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_trainings INTEGER NOT NULL DEFAULT 0,
  avg_distance_per90 NUMERIC(8,2),
  avg_sprint_distance_per90 NUMERIC(8,2),
  avg_hsr_per90 NUMERIC(8,2),
  avg_top_speed NUMERIC(5,2),
  avg_accelerations_per90 NUMERIC(6,2),
  avg_decelerations_per90 NUMERIC(6,2),
  avg_sprints_per90 NUMERIC(6,2),
  avg_performance_score NUMERIC(5,2),
  best_top_speed NUMERIC(5,2),
  best_distance_single_match NUMERIC(10,2),
  best_sprint_distance_single NUMERIC(8,2),
  best_performance_score NUMERIC(5,2),
  last_session_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_stats_aggregate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public player stats visible" ON public.player_stats_aggregate FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = player_id AND is_public = true)
);
CREATE POLICY "Users can view own stats" ON public.player_stats_aggregate FOR SELECT USING (
  player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own stats" ON public.player_stats_aggregate FOR UPDATE USING (
  player_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 7. anonymous_sessions
CREATE TABLE public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_token TEXT NOT NULL,
  session_type TEXT CHECK (session_type IN ('match','training')),
  session_date DATE,
  training_day TEXT CHECK (training_day IN ('MD-3','MD-2','MD-1','MD0','MD+1','MD+2','MD+3')),
  input_method TEXT CHECK (input_method IN ('pdf_upload','screenshot','manual')),
  gps_data JSONB,
  player_name TEXT,
  position TEXT,
  opponent TEXT,
  ai_report JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read anonymous sessions" ON public.anonymous_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create anonymous sessions" ON public.anonymous_sessions FOR INSERT WITH CHECK (true);

-- 8. affiliate_referrals
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled')),
  commission_rate NUMERIC(4,2) NOT NULL DEFAULT 0.20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.affiliate_referrals FOR SELECT USING (
  referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert referrals" ON public.affiliate_referrals FOR INSERT WITH CHECK (
  referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Triggers: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-create stats aggregate on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.player_stats_aggregate (player_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- Updated_at triggers for all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_affiliate_referrals_updated_at BEFORE UPDATE ON public.affiliate_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON public.player_stats_aggregate FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
