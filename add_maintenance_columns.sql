-- Add missing columns for Maintenance Logs
-- Typically these are status_before, status_after, parts_used, duration_hours

DO $$ 
BEGIN 
    -- 1. status_before
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'status_before') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN status_before TEXT;
    END IF;

    -- 2. status_after
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'status_after') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN status_after TEXT;
    END IF;

    -- 3. parts_used (Checking just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'parts_used') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN parts_used TEXT;
    END IF;

    -- 4. duration_hours (Checking just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'duration_hours') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN duration_hours NUMERIC;
    END IF;

END $$;
