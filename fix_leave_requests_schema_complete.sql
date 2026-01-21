-- Create the leave_requests table if it doesn't exist, and add missing columns

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    technician_id UUID REFERENCES public.technicians(id),
    leave_type TEXT,
    start_date DATE,
    end_date DATE,
    duration_days INTEGER,
    reason TEXT,
    bed_action TEXT,
    status TEXT DEFAULT 'pending',
    temporary_occupant_id UUID REFERENCES public.technicians(id)
);

-- Ensure RLS is enabled
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (simplified for this issue)
CREATE POLICY "Enable all access for all users" ON public.leave_requests
    FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns if table already existed but was incomplete
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'leave_type') THEN
        ALTER TABLE public.leave_requests ADD COLUMN leave_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'reason') THEN
        ALTER TABLE public.leave_requests ADD COLUMN reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'bed_action') THEN
        ALTER TABLE public.leave_requests ADD COLUMN bed_action TEXT;
    END IF;
    
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'start_date') THEN
        ALTER TABLE public.leave_requests ADD COLUMN start_date DATE;
    END IF;
    
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'end_date') THEN
        ALTER TABLE public.leave_requests ADD COLUMN end_date DATE;
    END IF;

END $$;
