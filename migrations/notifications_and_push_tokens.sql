-- Notifications and push tokens for synced web + app notifications
--
-- IMPORTANT: Run this in Supabase Dashboard → SQL Editor
-- Your current schema does NOT include these tables - notifications will not work until you run this.

-- 1. Push tokens table (Expo push tokens per profile/device)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE supabase_uid = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE supabase_uid = auth.uid()
    )
  );

-- 2. Notification messages table (inbox - synced between web and app)
CREATE TABLE IF NOT EXISTS public.notification_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_messages_recipient_created 
  ON public.notification_messages(recipient_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_messages_recipient_unread 
  ON public.notification_messages(recipient_profile_id) WHERE read_at IS NULL;

ALTER TABLE public.notification_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notification_messages
  FOR SELECT
  USING (
    recipient_profile_id IN (
      SELECT id FROM public.profiles WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "Users can update own notifications (mark read)"
  ON public.notification_messages
  FOR UPDATE
  USING (
    recipient_profile_id IN (
      SELECT id FROM public.profiles WHERE supabase_uid = auth.uid()
    )
  );

-- Insert is done via service role or a trigger; users don't insert their own received notifications
-- We use a permissive policy for insert: any authenticated user can insert (for team notifications)
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notification_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. RPC: get push tokens of teammates
CREATE OR REPLACE FUNCTION public.get_teammate_push_tokens()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt.token
  FROM push_tokens pt
  JOIN profiles me ON me.supabase_uid = auth.uid()
  JOIN profiles p ON p.id = pt.profile_id
  WHERE p.id != me.id
    AND p.teams IS NOT NULL
    AND me.teams IS NOT NULL
    AND p.teams && me.teams
    AND p.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_teammate_push_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teammate_push_tokens() TO service_role;

-- 4. RPC: get profile IDs of teammates (for inserting notification_messages)
CREATE OR REPLACE FUNCTION public.get_teammate_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM profiles me
  JOIN profiles p ON p.id != me.id
  WHERE me.supabase_uid = auth.uid()
    AND p.teams IS NOT NULL
    AND me.teams IS NOT NULL
    AND p.teams && me.teams
    AND p.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_teammate_profile_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teammate_profile_ids() TO service_role;

-- Enable Realtime for live inbox updates (optional - run if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notification_messages;
