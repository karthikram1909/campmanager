-- Create tables for Camp Hiring Request module

BEGIN;

-- 1. Camp Hiring Requests
CREATE TABLE IF NOT EXISTS camp_hiring_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    required_capacity INTEGER,
    period_start_date DATE,
    period_end_date DATE,
    reason TEXT,
    reason_details TEXT,
    notes TEXT,
    status TEXT,
    created_by TEXT, -- This seems to be used as a name in the UI, but requested_by_user_id is the link
    requested_by_user_id UUID,
    
    -- Manpower Control
    manpower_control_reviewed_by UUID,
    manpower_control_decision_date DATE,
    manpower_control_notes TEXT,
    manpower_control_projected_increase TEXT,
    
    -- Initial Approval
    initial_approval_by UUID,
    initial_approval_date DATE,
    initial_approval_notes TEXT,
    
    -- CPO Decision
    cpo_decision_by UUID,
    cpo_decision_date DATE,
    cpo_decision_notes TEXT,
    
    -- Result
    created_camp_id UUID,
    
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Used in sort
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Camp Audits
CREATE TABLE IF NOT EXISTS camp_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camp_hiring_request_id UUID REFERENCES camp_hiring_requests(id) ON DELETE CASCADE,
    audit_team TEXT, -- 'BE', 'LFT', 'HSSE'
    status TEXT DEFAULT 'pending',
    audited_by_user_id UUID,
    audit_date DATE,
    audit_time TEXT,
    notes TEXT,
    rejection_reason TEXT,
    checklist_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Procurement Decisions
CREATE TABLE IF NOT EXISTS procurement_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camp_hiring_request_id UUID REFERENCES camp_hiring_requests(id) ON DELETE CASCADE,
    camps_compared_data JSONB,
    recommended_camp_name TEXT,
    recommended_camp_location TEXT,
    recommended_camp_price NUMERIC,
    procurement_recommendation TEXT,
    procurement_status TEXT,
    procurement_decision_by UUID,
    decision_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE camp_hiring_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access on camp_hiring_requests" ON camp_hiring_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE camp_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access on camp_audits" ON camp_audits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE procurement_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access on procurement_decisions" ON procurement_decisions FOR ALL USING (true) WITH CHECK (true);

COMMIT;
