
-- Run this script in your Supabase SQL Editor to create missing medical tables.

BEGIN;

-- 1. Create Medical Records Table
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES technicians(id),
    camp_id UUID REFERENCES camps(id),
    hospital_id UUID REFERENCES hospitals(id),
    incident_date DATE,
    incident_time TIME,
    incident_type TEXT, -- illness, accident, etc.
    severity TEXT,
    initial_symptoms_diagnosis TEXT,
    camp_doctor_notes TEXT,
    current_medical_status TEXT,
    last_update_date DATE,
    attachments_urls TEXT,
    demise_occurred BOOLEAN DEFAULT FALSE,
    referred_to_hospital BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Insurance Claims Table
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_record_id UUID REFERENCES medical_records(id),
    claim_status TEXT DEFAULT 'pending',
    total_bill_amount NUMERIC(10,2),
    paid_by_insurance NUMERIC(10,2),
    paid_by_company NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Health Insurance Policies Table
CREATE TABLE IF NOT EXISTS health_insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number TEXT,
    provider_name TEXT,
    coverage_start_date DATE,
    coverage_end_date DATE,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access medical_records" ON medical_records;
CREATE POLICY "Public access medical_records" ON medical_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access insurance_claims" ON insurance_claims;
CREATE POLICY "Public access insurance_claims" ON insurance_claims FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE health_insurance_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access health_insurance_policies" ON health_insurance_policies;
CREATE POLICY "Public access health_insurance_policies" ON health_insurance_policies FOR ALL USING (true) WITH CHECK (true);

COMMIT;
