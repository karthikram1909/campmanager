-- NUCLEAR FIX for Infinite Recursion
-- We will simplify the policies to avoid the loop completely.

-- 1. Disable RLS momentarily to clear the slate
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on profiles (clean sweep)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Read Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Access" ON public.profiles;

-- 3. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLIFIED Policies (Non-Recursive)

-- READ: Allow ANY authenticated user to read ALL profiles.
-- This avoids querying the table to check for 'admin' role, breaking the loop.
-- (It is safe for this app as profiles mostly contain public info like names/emails for internal use)
CREATE POLICY "Allow Auth Read All" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- UPDATE: Allow users to existing their OWN profile.
-- (We use `auth.uid() = id` which is a simple check, no table lookup needed)
CREATE POLICY "Allow Owner Update" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- INSERT: Allow users to insert their OWN profile.
CREATE POLICY "Allow Owner Insert" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Force schema cache reload just in case
NOTIFY pgrst, 'reload schema';
