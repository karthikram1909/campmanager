-- Fix missing 'date' column in disciplinary_actions

DO $$ 
BEGIN 
    -- 1. date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disciplinary_actions' AND column_name = 'date') THEN
        ALTER TABLE public.disciplinary_actions ADD COLUMN date DATE;
    END IF;

END $$;
