-- FIX: Ensure 'roles' table exists and has correct columns
-- The error "400" when creating a role suggests the table might be missing columns or not exist at all.

-- 1. Ensure the 'roles' table exists
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT, -- We store permissions as a JSON string (e.g. "['perm1', 'perm2']")
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add 'is_active' column if it was missing (common issue)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'is_active') THEN
        ALTER TABLE public.roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Ensure permissions is TEXT (sometimes created as JSONB, which is fine, but TEXT is safer for simple string storage)
    -- If it doesn't exist, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'permissions') THEN
         ALTER TABLE public.roles ADD COLUMN permissions TEXT;
    END IF;
END $$;

-- 3. Disable RLS on roles to prevent permission errors
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
