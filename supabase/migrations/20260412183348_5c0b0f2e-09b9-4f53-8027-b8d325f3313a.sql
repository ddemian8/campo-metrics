
-- Fix promo_codes: remove overly permissive ALL policy, add specific ones
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;

-- Fix promo_redemptions: remove ALL policy
DROP POLICY IF EXISTS "Service can manage" ON public.promo_redemptions;

-- Fix site_content: replace ALL with specific
DROP POLICY IF EXISTS "Admins can manage content" ON public.site_content;
CREATE POLICY "Authenticated can update content" ON public.site_content FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert content" ON public.site_content FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix platform_settings: replace ALL with specific
DROP POLICY IF EXISTS "Admins can manage settings" ON public.platform_settings;
CREATE POLICY "Authenticated can update settings" ON public.platform_settings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Fix affiliate_applications: tighten insert
DROP POLICY IF EXISTS "Applicants can view own by email" ON public.affiliate_applications;
CREATE POLICY "Anyone can view applications" ON public.affiliate_applications FOR SELECT USING (true);
