-- Enable Google OAuth (run this in Supabase Dashboard → Authentication → Providers)
-- Google OAuth muss im Supabase Dashboard aktiviert werden:
-- 1. Settings → Authentication → Providers → Google
-- 2. Client ID: [REDACTED]
-- 3. Client Secret: [REDACTED]
-- 4. Redirect URL: https://YOUR-VERCEL-URL.vercel.app

-- Optional: Create function to auto-create user_data row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_data (user_id, data)
  VALUES (new.id, '{"exercises": {}, "logs": []}'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
