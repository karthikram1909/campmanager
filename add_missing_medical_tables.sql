
-- Run this script in your Supabase SQL Editor to create the missing 'hospitals' and 'disciplinary_action_types' tables.

BEGIN;

-- 1. Create Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    address TEXT,
    phone TEXT,
    emergency_number TEXT,
    email TEXT,
    contact_person TEXT,
    specialties TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Disciplinary Action Types Table
CREATE TABLE IF NOT EXISTS disciplinary_action_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g. 'Termination', 'Warning'
    description TEXT,
    severity_level TEXT, -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Seed Disciplinary Action Types (if empty)
INSERT INTO disciplinary_action_types (name, description, severity_level)
VALUES 
    ('Termination', 'Contract termination due to violation or unfitness', 'critical'),
    ('Written Warning', 'Formal written warning', 'medium'),
    ('Verbal Warning', 'Informal verbal warning', 'low'),
    ('Suspension', 'Temporary suspension from work', 'high')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access hospitals" ON hospitals;
CREATE POLICY "Public access hospitals" ON hospitals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE disciplinary_action_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access disciplinary_action_types" ON disciplinary_action_types;
CREATE POLICY "Public access disciplinary_action_types" ON disciplinary_action_types FOR ALL USING (true) WITH CHECK (true);

COMMIT;
