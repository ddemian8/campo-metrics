
-- Drop the old overly-permissive policies
DROP POLICY IF EXISTS "Anyone can create anonymous sessions" ON public.anonymous_sessions;
DROP POLICY IF EXISTS "Anyone can read anonymous sessions" ON public.anonymous_sessions;
DROP POLICY IF EXISTS "Anyone can update anonymous sessions" ON public.anonymous_sessions;

-- Allow creating a session (token in row must match header)
CREATE POLICY "Create own anonymous session"
ON public.anonymous_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (
  anonymous_token = (current_setting('request.headers', true)::json->>'x-anonymous-token')
);

-- Allow reading only own session by token
CREATE POLICY "Read own anonymous session"
ON public.anonymous_sessions FOR SELECT
TO anon, authenticated
USING (
  anonymous_token = (current_setting('request.headers', true)::json->>'x-anonymous-token')
);

-- Allow updating only own session by token
CREATE POLICY "Update own anonymous session"
ON public.anonymous_sessions FOR UPDATE
TO anon, authenticated
USING (
  anonymous_token = (current_setting('request.headers', true)::json->>'x-anonymous-token')
)
WITH CHECK (
  anonymous_token = (current_setting('request.headers', true)::json->>'x-anonymous-token')
);
