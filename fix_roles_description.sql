-- FIX: Add 'description' column to roles table and FORCE schema reload
-- The error "Could not find the 'description' column" means the column is missing OR Supabase cache is stale.

DO $$ 
BEGIN 
    -- 1. Ensure 'description' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'description') THEN
        ALTER TABLE public.roles ADD COLUMN description TEXT;
    END IF;

    -- 2. Ensure 'permissions' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'permissions') THEN
        ALTER TABLE public.roles ADD COLUMN permissions TEXT;
    END IF;

    -- 3. Ensure 'is_active' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'is_active') THEN
        ALTER TABLE public.roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

END $$;

-- 4. FORCE schema cache reload
NOTIFY pgrst, 'reload schema';
