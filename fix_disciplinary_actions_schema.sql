-- Create the disciplinary_actions table if it doesn't exist, and add missing columns

CREATE TABLE IF NOT EXISTS public.disciplinary_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    technician_id UUID REFERENCES public.technicians(id),
    date DATE,
    action_type TEXT,
    action_type_id UUID REFERENCES public.disciplinary_action_types(id),
    severity TEXT,
    violation TEXT,
    action_taken TEXT,
    reported_by TEXT,
    witness TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    notes TEXT
);

-- Ensure RLS is enabled
ALTER TABLE public.disciplinary_actions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (simplified for this issue)
CREATE POLICY "Enable all access for all users" ON public.disciplinary_actions
    FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns if table already existed but was incomplete
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'action_taken') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN action_taken TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'action_type') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN action_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'severity') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN severity TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'violation') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN violation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'reported_by') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN reported_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'witness') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN witness TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'follow_up_required') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN follow_up_required BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'notes') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN notes TEXT;
    END IF;

END $$;
