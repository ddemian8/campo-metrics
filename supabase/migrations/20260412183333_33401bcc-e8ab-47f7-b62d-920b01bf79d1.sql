
-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan_type text NOT NULL DEFAULT 'player_pro',
  duration_days integer NOT NULL DEFAULT 30,
  max_uses integer,
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (true);

-- Promo redemptions
CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id),
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own redemptions" ON public.promo_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON public.promo_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can manage" ON public.promo_redemptions FOR ALL USING (true);

-- Affiliate applications
CREATE TABLE public.affiliate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text NOT NULL,
  promotion_channels text[] NOT NULL DEFAULT '{}',
  social_media_link text,
  estimated_reach text,
  motivation text,
  payment_method text NOT NULL DEFAULT 'revolut',
  revolut_name text,
  revolut_tag_or_iban text,
  bank_account_name text,
  bank_iban text,
  bank_swift text,
  bank_name text,
  bank_address text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit application" ON public.affiliate_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Applicants can view own by email" ON public.affiliate_applications FOR SELECT USING (true);

-- Affiliate profiles
CREATE TABLE public.affiliate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  application_id uuid REFERENCES public.affiliate_applications(id),
  affiliate_code text NOT NULL UNIQUE,
  affiliate_link text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.20,
  total_clicks integer NOT NULL DEFAULT 0,
  total_referrals integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_details jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own affiliate profile" ON public.affiliate_profiles FOR SELECT USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public can view affiliate profiles" ON public.affiliate_profiles FOR SELECT USING (true);

-- Affiliate clicks
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id),
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  source_url text
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Affiliates can view own clicks" ON public.affiliate_clicks FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliate_profiles WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Affiliate payouts
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id),
  amount numeric NOT NULL,
  payment_method text,
  payment_reference text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliate_profiles WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Affiliates can request payouts" ON public.affiliate_payouts FOR INSERT WITH CHECK (
  affiliate_id IN (SELECT id FROM affiliate_profiles WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Update existing affiliate_referrals to add new columns
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliate_profiles(id);
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS referred_user_id uuid;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS referral_code_used text;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS signed_up_at timestamptz DEFAULT now();
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS converted_at timestamptz;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS plan_type text;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS commission_per_month numeric DEFAULT 0;

-- Site content (CMS)
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(page, section)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage content" ON public.site_content FOR ALL USING (true);

-- Platform settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (true);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('sender_email', 'DDemian6@gmail.com'),
  ('free_report_limit', '3'),
  ('admin_emails', 'DDemian6@gmail.com'),
  ('maintenance_mode', 'false'),
  ('default_commission_rate', '0.20'),
  ('min_payout_referrals', '10'),
  ('min_payout_amount', '20'),
  ('registration_enabled', 'true'),
  ('min_leaderboard_sessions', '1');

-- Insert default promo code
INSERT INTO public.promo_codes (code, plan_type, duration_days, max_uses) VALUES
  ('CAMPOMETRIC25', 'player_pro', 90, 25);

-- Insert default site content
INSERT INTO public.site_content (page, section, content) VALUES
  ('homepage', 'hero_title', 'Your GPS data. Your performance story.'),
  ('homepage', 'hero_subtitle', 'Upload your GPS tracker data. Get a personalized AI-powered performance report with benchmarks, insights, and a Campometric Performance Index (CPI).'),
  ('homepage', 'hero_button_text', 'Get your GPS report — it''s free'),
  ('homepage', 'compatible_platforms', 'Catapult,Statsports,Polar,Garmin,Playertek,Fieldwiz'),
  ('pricing', 'free_price', '0'),
  ('pricing', 'pro_price', '9'),
  ('pricing', 'club_price', '59'),
  ('footer', 'copyright_year', '2025'),
  ('footer', 'social_twitter', ''),
  ('footer', 'social_instagram', ''),
  ('footer', 'social_linkedin', '');
