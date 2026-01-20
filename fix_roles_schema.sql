-- Ensure all necessary tables and columns exist for the "Roles & Permissions" page to function correctly.

-- 1. Update 'profiles' table to support Camp and Party assignment
DO $$ 
BEGIN 
    -- camp_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'camp_id') THEN
        ALTER TABLE public.profiles ADD COLUMN camp_id UUID REFERENCES public.camps(id);
    END IF;

    -- induction_party_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'induction_party_id') THEN
        ALTER TABLE public.profiles ADD COLUMN induction_party_id UUID REFERENCES public.induction_parties(id);
    END IF;
END $$;

-- 2. Ensure 'roles' table exists
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT, -- Stored as JSON string as per code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure 'user_roles' table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL, -- Code uses user_email for mapping
    assigned_by TEXT,
    assigned_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on new tables (Roles and User Roles)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Add loose RLS policies for now to avoid access issues (Internal Tool Assumption)
DROP POLICY IF EXISTS "Allow all access to roles" ON public.roles;
CREATE POLICY "Allow all access to roles" ON public.roles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to user_roles" ON public.user_roles;
CREATE POLICY "Allow all access to user_roles" ON public.user_roles FOR ALL USING (true);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
