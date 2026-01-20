
-- Run this script in your Supabase SQL Editor to create 'events' and 'event_registrations' tables.

BEGIN;

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camp_id UUID REFERENCES camps(id), -- Optional: Primary camp for the event
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL, -- 'sports', 'outing', 'cultural', etc.
    date DATE NOT NULL,
    time TIME,
    end_time TIME,
    location TEXT NOT NULL,
    meeting_point TEXT,
    meeting_time TIME,
    max_participants INTEGER,
    registration_deadline DATE,
    cost_per_person NUMERIC(10,2) DEFAULT 0,
    budget_allocated NUMERIC(10,2) DEFAULT 0,
    actual_cost NUMERIC(10,2) DEFAULT 0,
    activities_planned TEXT,
    food_provided BOOLEAN DEFAULT FALSE,
    transport_provided BOOLEAN DEFAULT FALSE,
    gifts_prizes_provided BOOLEAN DEFAULT FALSE,
    notes TEXT,
    status TEXT DEFAULT 'planning', -- 'planning', 'open_for_registration', 'confirmed', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Event Registrations Table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered', -- 'registered', 'attended', 'cancelled', 'no_show'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, technician_id)
);

-- 3. Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access events" ON events;
CREATE POLICY "Public access events" ON events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access event_registrations" ON event_registrations;
CREATE POLICY "Public access event_registrations" ON event_registrations FOR ALL USING (true) WITH CHECK (true);

COMMIT;
