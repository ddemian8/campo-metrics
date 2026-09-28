DROP POLICY IF EXISTS "Activate via valid token" ON public.club_players;
CREATE POLICY "Activate via valid token"
  ON public.club_players
  FOR UPDATE
  USING (
    activation_token IS NOT NULL
    AND token_expires_at IS NOT NULL
    AND token_expires_at > now()
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );