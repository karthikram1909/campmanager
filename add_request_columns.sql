-- Add missing columns for Maintenance Requests
-- 'location_in_camp' is missing from 'maintenance_requests'

DO $$ 
BEGIN 
    -- 1. location_in_camp for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'location_in_camp') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN location_in_camp TEXT;
    END IF;

    -- 2. time_reported for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'time_reported') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN time_reported TEXT;
    END IF;

    -- 3. reported_by for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'reported_by') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN reported_by TEXT;
    END IF;

    -- 4. assigned_to for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN assigned_to TEXT;
    END IF;

    -- 5. actual_cost for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'actual_cost') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN actual_cost NUMERIC;
    END IF;

    -- 6. resolution_details for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'resolution_details') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN resolution_details TEXT;
    END IF;
    
    -- 7. resolved_by for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'resolved_by') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN resolved_by TEXT;
    END IF;
    
    -- 8. resolved_date for maintenance_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'resolved_date') THEN
        ALTER TABLE public.maintenance_requests ADD COLUMN resolved_date DATE;
    END IF;

END $$;
