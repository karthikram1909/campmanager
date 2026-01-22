-- Add technician_id and external_personnel_id columns to beds table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'technician_id') THEN
        ALTER TABLE beds ADD COLUMN technician_id UUID REFERENCES technicians(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'external_personnel_id') THEN
        ALTER TABLE beds ADD COLUMN external_personnel_id UUID REFERENCES external_personnel(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beds' AND column_name = 'reserved_for') THEN
        ALTER TABLE beds ADD COLUMN reserved_for UUID REFERENCES technicians(id);
    END IF;
END $$;

-- Force schema cache refresh by notifying pgrst (Supabase specific)
NOTIFY pgrst, 'reload config';
