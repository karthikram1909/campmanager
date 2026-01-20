-- Add missing columns to the 'documents' table to support Camp Documents

DO $$ 
BEGIN 
    -- 1. Add camp_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'camp_id') THEN
        ALTER TABLE public.documents ADD COLUMN camp_id UUID REFERENCES public.camps(id) ON DELETE CASCADE;
    END IF;

    -- 2. Add document_name column (often used for camp docs instead of just type)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_name') THEN
        ALTER TABLE public.documents ADD COLUMN document_name TEXT;
    END IF;

    -- 3. Add issuing_authority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'issuing_authority') THEN
        ALTER TABLE public.documents ADD COLUMN issuing_authority TEXT;
    END IF;

    -- 4. Make technician_id nullable if it isn't already (since camp docs won't have a technician)
    ALTER TABLE public.documents ALTER COLUMN technician_id DROP NOT NULL;

END $$;
