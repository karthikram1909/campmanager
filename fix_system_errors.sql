-- FIX 1: Resolve "Infinite Recursion" in Profiles Table RLS
-- The recursion happens when a policy on 'profiles' tries to query 'profiles' to check a role.
-- We fix this by creating a SECURITY DEFINER function that bypasses RLS to safely check the role.

-- A. Create the safe admin check function
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges, ignoring RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- B. Clean up potential bad policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all" ON public.profiles;

-- C. Apply new, non-recursive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own profile. Admins can read everyone's.
CREATE POLICY "Profiles Read Access" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR is_admin_safe()
);

-- Users can update their own. Admins can update everyone's.
CREATE POLICY "Profiles Update Access" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id OR is_admin_safe()
);

-- Trigger/System can insert
CREATE POLICY "Profiles Insert Access" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id OR is_admin_safe()
);


-- FIX 2: Create Missing 'meal_preference_changes' Table
CREATE TABLE IF NOT EXISTS public.meal_preference_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE,
    request_type TEXT DEFAULT 'change_preference', -- 'change', 'cancel', etc.
    old_preference TEXT,
    new_preference TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS for the new table
ALTER TABLE public.meal_preference_changes ENABLE ROW LEVEL SECURITY;

-- Add generic access policy (refine this later if needed)
CREATE POLICY "Authenticated users can manage meal requests" ON public.meal_preference_changes
FOR ALL USING (auth.role() = 'authenticated');


-- FIX 3: Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
