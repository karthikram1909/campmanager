-- Fix missing columns for Leave Management
-- 'reason' and 'bed_action' are potentially missing from 'leave_requests'

DO $$ 
BEGIN 
    -- 1. reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'reason') THEN
        ALTER TABLE public.leave_requests ADD COLUMN reason TEXT;
    END IF;

    -- 2. bed_action
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'bed_action') THEN
        ALTER TABLE public.leave_requests ADD COLUMN bed_action TEXT;
    END IF;

    -- 3. duration_days (Just in case, though likely present or calculated)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'duration_days') THEN
        ALTER TABLE public.leave_requests ADD COLUMN duration_days INTEGER;
    END IF;

    -- 4. temporary_occupant_id (If used for temporary allocation tracking)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'temporary_occupant_id') THEN
        ALTER TABLE public.leave_requests ADD COLUMN temporary_occupant_id UUID REFERENCES public.technicians(id);
    END IF;

END $$;
