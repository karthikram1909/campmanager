-- Force reload the schema cache by making a trivial change
NOTIFY pgrst, 'reload schema';

DO $$ 
BEGIN 
    -- 1. Ensure 'technician_id' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'technician_id') THEN
        ALTER TABLE public.documents ADD COLUMN technician_id UUID REFERENCES public.technicians(id) ON DELETE CASCADE;
    ELSE
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

    -- 5. Ensure 'issue_date' exists (it was missing from error log)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'issue_date') THEN
        ALTER TABLE public.documents ADD COLUMN issue_date DATE;
    END IF;

     -- 6. Ensure 'expiry_date' exists (crucial!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'expiry_date') THEN
        ALTER TABLE public.documents ADD COLUMN expiry_date DATE;
    END IF;

    -- 7. Ensure 'document_number' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_number') THEN
        ALTER TABLE public.documents ADD COLUMN document_number TEXT;
    END IF;

     -- 8. Ensure 'document_type' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_type') THEN
        ALTER TABLE public.documents ADD COLUMN document_type TEXT;
    END IF;

     -- 9. Ensure 'file_url' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_url') THEN
        ALTER TABLE public.documents ADD COLUMN file_url TEXT;
    END IF;

    -- 10. Ensure 'notes' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'notes') THEN
        ALTER TABLE public.documents ADD COLUMN notes TEXT;
    END IF;

    -- 11. Ensure 'is_active' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_active') THEN
        ALTER TABLE public.documents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

END $$;
