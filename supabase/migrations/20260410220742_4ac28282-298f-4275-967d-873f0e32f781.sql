-- Allow users to update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.sessions
FOR UPDATE
USING (player_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- Allow users to update their own reports
CREATE POLICY "Users can update own reports"
ON public.reports
FOR UPDATE
USING (player_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));