
-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_settings
    WHERE key = 'admin_emails'
      AND position(lower((SELECT email FROM auth.users WHERE id = auth.uid())) IN lower(value)) > 0
  )
  OR lower((SELECT email FROM auth.users WHERE id = auth.uid())) = 'ddemian6@gmail.com';
$$;

-- ============================================
-- FIX 1: affiliate_applications
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view applications" ON public.affiliate_applications;
DROP POLICY IF EXISTS "Anyone can submit application" ON public.affiliate_applications;

-- Public can submit applications (INSERT only, no auth required)
CREATE POLICY "Public can submit applications"
ON public.affiliate_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read all applications
CREATE POLICY "Admins can view all applications"
ON public.affiliate_applications
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
ON public.affiliate_applications
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ============================================
-- FIX 2: site_content - restrict writes to admins
-- ============================================

DROP POLICY IF EXISTS "Authenticated can insert content" ON public.site_content;
DROP POLICY IF EXISTS "Authenticated can update content" ON public.site_content;

CREATE POLICY "Admins can insert content"
ON public.site_content
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update content"
ON public.site_content
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ============================================
-- FIX 3: platform_settings - restrict writes to admins
-- ============================================

DROP POLICY IF EXISTS "Authenticated can update settings" ON public.platform_settings;

CREATE POLICY "Admins can update settings"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ============================================
-- FIX 4: affiliate_profiles - add admin write policies
-- ============================================

CREATE POLICY "Admins can insert affiliate profiles"
ON public.affiliate_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update affiliate profiles"
ON public.affiliate_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ============================================
-- FIX 5: affiliate_payouts - add admin update policy
-- ============================================

CREATE POLICY "Admins can update payouts"
ON public.affiliate_payouts
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view all payouts"
ON public.affiliate_payouts
FOR SELECT
TO authenticated
USING (public.is_admin());
