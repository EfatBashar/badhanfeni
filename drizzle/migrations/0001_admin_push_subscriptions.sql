CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated
USING ((SELECT auth.jwt() ->> 'email') = 'badhanfgcunit2018@gmail.com')
WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'badhanfgcunit2018@gmail.com');