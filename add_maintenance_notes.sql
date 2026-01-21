-- Add missing 'notes' column to maintenance_logs table

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_logs' AND column_name = 'notes') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN notes TEXT;
    END IF;
END $$;
