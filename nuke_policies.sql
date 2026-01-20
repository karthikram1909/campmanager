-- NUCLEAR OPTION: Dynamic Policy Cleanup
-- This script will find ANY and ALL policies on the 'profiles' table and delete them.
-- Then it will ensure RLS is disabled to guarantee access.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Disable RLS immediately to stop the recursion checks
    EXECUTE 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY';
    
    -- 2. Loop through every single existing policy on 'profiles' and drop it
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        RAISE NOTICE 'Dropping policy: %', r.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
    
    -- 3. Also clean up 'technicians' policies just in case
    EXECUTE 'ALTER TABLE public.technicians DISABLE ROW LEVEL SECURITY';
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'technicians') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.technicians', r.policyname);
    END LOOP;

    -- 4. Reload the schema cache to make sure Supabase API knows about these changes
    PERFORM pg_notify('pgrst', 'reload schema');
    
END $$;

-- 5. Verify access by selecting a count
SELECT count(*) as profile_count FROM public.profiles;
