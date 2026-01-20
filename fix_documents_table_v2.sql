-- Comprehensive fix for the 'documents' table
-- This script ensures all necessary columns exist, creating them if they don't.

DO $$ 
BEGIN 
    -- 1. Ensure 'technician_id' exists (it seems to be missing!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'technician_id') THEN
        ALTER TABLE public.documents ADD COLUMN technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE;
    ELSE
        -- If it exists, make sure it's nullable (to allow Camp Documents)
        ALTER TABLE public.documents ALTER COLUMN technician_id DROP NOT NULL;
    END IF;

    -- 2. Ensure 'camp_id' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'camp_id') THEN
        ALTER TABLE public.documents ADD COLUMN camp_id UUID REFERENCES public.camps(id) ON DELETE CASCADE;
    END IF;

    -- 3. Ensure 'document_name' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_name') THEN
        ALTER TABLE public.documents ADD COLUMN document_name TEXT;
    END IF;

    -- 4. Ensure 'issuing_authority' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'issuing_authority') THEN
        ALTER TABLE public.documents ADD COLUMN issuing_authority TEXT;
    END IF;

    -- 5. Ensure 'notes' exists (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'notes') THEN
        ALTER TABLE public.documents ADD COLUMN notes TEXT;
    END IF;

    -- 6. Ensure 'is_active' exists (default true)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_active') THEN
        ALTER TABLE public.documents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

END $$;
