-- Disable email confirmation for new signups
-- This needs to be run in your Supabase dashboard under Authentication > Settings

-- Note: This SQL is for reference only - you need to configure this in your Supabase dashboard
-- Go to Authentication > Settings and set "Enable email confirmations" to OFF

-- Alternatively, you can use the Supabase CLI or API to update these settings
-- But the easiest way is through the dashboard UI

-- For existing users who might be in an unconfirmed state, you can run:
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
