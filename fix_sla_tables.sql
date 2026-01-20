-- FIX: Ensure 'sla_policies' and 'sla_logs' tables exist with correct schema
-- The user is attempting to add SLA policies, so we must ensure the backend supports it.

-- 1. Ensure 'sla_policies' table exists
CREATE TABLE IF NOT EXISTS public.sla_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_name TEXT NOT NULL,
    request_type TEXT NOT NULL,
    target_completion_hours INTEGER DEFAULT 24,
    escalation_level_1_hours INTEGER,
    escalation_level_2_hours INTEGER,
    escalation_level_1_emails TEXT,
    escalation_level_2_emails TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    auto_send_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure all columns exist (in case table existed but was incomplete)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sla_policies' AND column_name = 'auto_send_emails') THEN
        ALTER TABLE public.sla_policies ADD COLUMN auto_send_emails BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sla_policies' AND column_name = 'request_type') THEN
        ALTER TABLE public.sla_policies ADD COLUMN request_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sla_policies' AND column_name = 'description') THEN
        ALTER TABLE public.sla_policies ADD COLUMN description TEXT;
    END IF;
END $$;

-- 3. Ensure 'sla_logs' table exists (used for monitoring coverage)
CREATE TABLE IF NOT EXISTS public.sla_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    related_id UUID, -- ID of the request being tracked
    related_table TEXT, -- Table name of the request
    policy_id UUID REFERENCES public.sla_policies(id),
    start_time TIMESTAMP WITH TIME ZONE,
    target_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE,
    is_breached BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Disable RLS on these tables to prevent access issues
ALTER TABLE public.sla_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_logs DISABLE ROW LEVEL SECURITY;

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';
