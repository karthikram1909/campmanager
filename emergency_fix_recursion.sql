-- EMERGENCY: Disable Row Level Security on the 'profiles' table.
-- The current security policies are checking themselves in an infinite loop, causing the "Recursion" error.
-- Disabling RLS will immediately stop the loop and allow the data to load.

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify it worked by responding with the count of profiles
SELECT count(*) as profile_count FROM public.profiles;
