-- Fix missing columns for meal_preference_changes table

DO $$ 
BEGIN 
    -- 1. current_meal_preference_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'current_meal_preference_id') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN current_meal_preference_id UUID REFERENCES public.meal_preferences(id);
    END IF;

    -- 2. requested_meal_preference_id (renamed from new_meal_preference_id to match code)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'requested_meal_preference_id') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN requested_meal_preference_id UUID REFERENCES public.meal_preferences(id);
    END IF;

    -- 3. technician_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'technician_id') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN technician_id UUID REFERENCES public.technicians(id);
    END IF;

    -- 4. external_personnel_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'external_personnel_id') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN external_personnel_id UUID REFERENCES public.external_personnel(id);
    END IF;

    -- 5. request_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'request_date') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN request_date DATE;
    END IF;

    -- 6. reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'reason') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN reason TEXT;
    END IF;

    -- 7. status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'status') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN status TEXT DEFAULT 'pending_approval';
    END IF;

    -- 8. approval_date (for history)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'approval_date') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN approval_date DATE;
    END IF;

    -- 9. approved_by_id (for history)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'approved_by_id') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN approved_by_id UUID REFERENCES auth.users(id); -- Or public.profiles if referencing profiles
    END IF;

    -- 10. rejection_reason (for rejection)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_preference_changes' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.meal_preference_changes ADD COLUMN rejection_reason TEXT;
    END IF;

END $$;
