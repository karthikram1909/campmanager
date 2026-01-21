-- Add missing columns to 'technicians' table for transfer and exit tracking

DO $$ 
BEGIN 
    -- 1. Add last_transfer_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'last_transfer_date') THEN
        ALTER TABLE public.technicians ADD COLUMN last_transfer_date DATE;
    END IF;

    -- 2. Add sonapur_exit_camp_id used for tracking exit process
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'sonapur_exit_camp_id') THEN
        ALTER TABLE public.technicians ADD COLUMN sonapur_exit_camp_id UUID REFERENCES public.camps(id);
    END IF;

    -- 3. Add sonapur_exit_start_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'sonapur_exit_start_date') THEN
        ALTER TABLE public.technicians ADD COLUMN sonapur_exit_start_date DATE;
    END IF;

    -- 4. Add exit_process_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'technicians' AND column_name = 'exit_process_status') THEN
        ALTER TABLE public.technicians ADD COLUMN exit_process_status TEXT;
    END IF;

END $$;
