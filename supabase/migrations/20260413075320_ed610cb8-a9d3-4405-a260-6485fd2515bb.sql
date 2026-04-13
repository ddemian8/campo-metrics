
-- FIX 1: Replace substring-based is_admin() with exact match to prevent privilege escalation
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
      AND lower((SELECT email FROM auth.users WHERE id = auth.uid()))
        = ANY(
          SELECT trim(lower(unnest(string_to_array(value, ','))))
          FROM platform_settings
          WHERE key = 'admin_emails'
        )
  )
  OR lower((SELECT email FROM auth.users WHERE id = auth.uid())) = 'ddemian6@gmail.com';
$$;

-- FIX 2: Remove public SELECT policy on affiliate_profiles that exposes payment data
DROP POLICY IF EXISTS "Public can view affiliate profiles" ON public.affiliate_profiles;

-- Add admin SELECT policy so admin panel still works
CREATE POLICY "Admins can view all affiliate profiles"
ON public.affiliate_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());
