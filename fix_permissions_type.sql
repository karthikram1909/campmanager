-- FIX: Change 'permissions' column from ARRAY to TEXT
-- The error "malformed array literal" happens because the database thinks 'permissions' is an Array (text[]),
-- but the application is treating it as a JSON String (TEXT).
-- This script converts the column to TEXT, allowing JSON strings to be saved correctly.

DO $$ 
BEGIN 
    -- Only run this if the column exists and is likely an array (we'll just force it to TEXT)
    
    -- 1. Attempt to convert ARRAY to JSON TEXT (preserves data if it was an array)
    -- We use separate statements to handle potential errors gracefully or just force it.
    
    BEGIN
        ALTER TABLE public.roles 
        ALTER COLUMN permissions TYPE TEXT 
        USING array_to_json(permissions)::text;
    EXCEPTION WHEN OTHERS THEN
        -- If conversion fails (e.g., inconsistent data), just forcefuly change it to text
        -- (Data might look like "{item1,item2}" but new data will be correct JSON)
        ALTER TABLE public.roles 
        ALTER COLUMN permissions TYPE TEXT;
    END;

END $$;

-- 2. Force schema reload
NOTIFY pgrst, 'reload schema';
