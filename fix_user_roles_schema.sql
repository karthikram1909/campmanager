-- FIX: Add 'assigned_by' column to user_roles table
-- The error "Could not find the 'assigned_by' column" means the schema is incomplete.
-- This script adds the missing column and refreshes the cache.

DO $$ 
BEGIN 
    -- 1. Ensure 'assigned_by' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'assigned_by') THEN
        ALTER TABLE public.user_roles ADD COLUMN assigned_by TEXT;
    END IF;

    -- 2. Ensure 'assigned_date' column exists (good practice to check related column too)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'assigned_date') THEN
        ALTER TABLE public.user_roles ADD COLUMN assigned_date DATE DEFAULT CURRENT_DATE;
    END IF;

    -- 3. Ensure 'user_email' is present (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'user_email') THEN
        ALTER TABLE public.user_roles ADD COLUMN user_email TEXT NOT NULL;
    END IF;

END $$;

-- 4. FORCE schema reload
NOTIFY pgrst, 'reload schema';
