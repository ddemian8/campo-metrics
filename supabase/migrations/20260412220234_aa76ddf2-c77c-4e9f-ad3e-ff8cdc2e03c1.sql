
-- Allow users to delete their own reports
CREATE POLICY "Users can delete own reports"
ON public.reports
FOR DELETE
USING (player_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Allow users to delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.sessions
FOR DELETE
USING (player_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));
