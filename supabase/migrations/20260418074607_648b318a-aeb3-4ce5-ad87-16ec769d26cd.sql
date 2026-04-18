-- Activation tokens for inviting players to create their own account
ALTER TABLE public.club_players
  ADD COLUMN IF NOT EXISTS activation_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS club_players_activation_token_uidx
  ON public.club_players(activation_token)
  WHERE activation_token IS NOT NULL;

-- Notification tracking on individual club reports
ALTER TABLE public.club_reports
  ADD COLUMN IF NOT EXISTS notification_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

-- Allow looking up a club_player by activation token (anon-friendly)
DROP POLICY IF EXISTS "Lookup club_player by activation token" ON public.club_players;
CREATE POLICY "Lookup club_player by activation token"
  ON public.club_players
  FOR SELECT
  USING (
    activation_token IS NOT NULL
    AND token_expires_at IS NOT NULL
    AND token_expires_at > now()
  );

-- Allow a player to update their own row when activating with a valid token
-- (used to clear the token + set user_id + position when they finish signup)
DROP POLICY IF EXISTS "Activate via valid token" ON public.club_players;
CREATE POLICY "Activate via valid token"
  ON public.club_players
  FOR UPDATE
  USING (
    activation_token IS NOT NULL
    AND token_expires_at IS NOT NULL
    AND token_expires_at > now()
  )
  WITH CHECK (true);