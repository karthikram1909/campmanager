-- Add missing columns for Camp Induction Tracking to technicians and external_personnel tables

DO $$ 
BEGIN 
    -- 1. camp_induction_attachments for technicians
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'camp_induction_attachments') THEN
        ALTER TABLE public.technicians ADD COLUMN camp_induction_attachments TEXT; -- Storing JSON string
    END IF;

    -- 2. camp_induction_completed for technicians
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'camp_induction_completed') THEN
        ALTER TABLE public.technicians ADD COLUMN camp_induction_completed BOOLEAN DEFAULT FALSE;
    END IF;

    -- 3. camp_induction_date for technicians
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'camp_induction_date') THEN
        ALTER TABLE public.technicians ADD COLUMN camp_induction_date DATE;
    END IF;

    -- 4. camp_induction_time for technicians
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'camp_induction_time') THEN
        ALTER TABLE public.technicians ADD COLUMN camp_induction_time TEXT;
    END IF;


    -- REPEAT FOR EXTERNAL PERSONNEL (Just in case)
    
    -- 1. camp_induction_attachments for external_personnel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'external_personnel' AND column_name = 'camp_induction_attachments') THEN
        ALTER TABLE public.external_personnel ADD COLUMN camp_induction_attachments TEXT;
    END IF;

    -- 2. camp_induction_completed for external_personnel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'external_personnel' AND column_name = 'camp_induction_completed') THEN
        ALTER TABLE public.external_personnel ADD COLUMN camp_induction_completed BOOLEAN DEFAULT FALSE;
    END IF;

    -- 3. camp_induction_date for external_personnel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'external_personnel' AND column_name = 'camp_induction_date') THEN
        ALTER TABLE public.external_personnel ADD COLUMN camp_induction_date DATE;
    END IF;

    -- 4. camp_induction_time for external_personnel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'external_personnel' AND column_name = 'camp_induction_time') THEN
        ALTER TABLE public.external_personnel ADD COLUMN camp_induction_time TEXT;
    END IF;

END $$;
