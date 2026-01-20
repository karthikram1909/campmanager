
-- Run this script in your Supabase SQL Editor to add the missing maintenance tables.

BEGIN;

-- 23. Maintenance Schedules
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    task_description TEXT NOT NULL,
    frequency_days INTEGER,
    due_date DATE,
    estimated_duration_hours NUMERIC,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'overdue'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Maintenance Logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    date_performed DATE DEFAULT CURRENT_DATE,
    type TEXT, -- 'preventive', 'corrective', 'breakdown'
    description TEXT,
    performed_by TEXT,
    parts_used TEXT, -- Added missing column
    cost NUMERIC,
    duration_hours NUMERIC,
    status_after TEXT, -- 'active', 'under_maintenance', 'faulty'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on maintenance_logs" ON maintenance_logs FOR ALL USING (true) WITH CHECK (true);

COMMIT;
