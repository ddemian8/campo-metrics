
-- Add admin_notes column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes text;

-- Admins can view ALL profiles (not just public ones)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_admin());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (is_admin());

-- Admins can insert promo codes
CREATE POLICY "Admins can insert promo codes"
ON public.promo_codes FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Admins can update promo codes
CREATE POLICY "Admins can update promo codes"
ON public.promo_codes FOR UPDATE TO authenticated
USING (is_admin());

-- Admins can delete promo codes
CREATE POLICY "Admins can delete promo codes"
ON public.promo_codes FOR DELETE TO authenticated
USING (is_admin());

-- Admins can delete profiles (for user deletion)
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (is_admin());
