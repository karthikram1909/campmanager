-- Complete fix for Maintenance feature schema
-- This script adds ALL potentially missing columns to maintenance_schedules and maintenance_logs

DO $$ 
BEGIN 
    -- 1. Fix 'maintenance_schedules' table
    
    -- last_completed_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_schedules' AND column_name = 'last_completed_date') THEN
        ALTER TABLE public.maintenance_schedules ADD COLUMN last_completed_date DATE;
    END IF;


    -- 2. Fix 'maintenance_logs' table
    
    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'notes') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN notes TEXT;
    END IF;

    -- status_before
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'status_before') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN status_before TEXT;
    END IF;

    -- status_after
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'status_after') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN status_after TEXT;
    END IF;

    -- parts_used
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'parts_used') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN parts_used TEXT;
    END IF;

    -- duration_hours
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'duration_hours') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN duration_hours NUMERIC;
    END IF;

    -- cost (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'cost') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN cost NUMERIC;
    END IF;

    -- performed_by (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'performed_by') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN performed_by TEXT;
    END IF;

END $$;
