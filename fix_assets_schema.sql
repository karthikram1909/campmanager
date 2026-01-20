
-- Run this script in your Supabase SQL Editor to fix the assets table schema issues.
-- This will DROP the existing (empty) assets table and recreate it with the correct columns.

BEGIN;

-- Drop the table if it exists (assuming it is empty or data can be discarded during dev)
DROP TABLE IF EXISTS assets;

-- Recreate the table with correct columns matching the Frontend
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_tag TEXT, 
  name TEXT NOT NULL,
  type TEXT,
  camp_id UUID REFERENCES camps(id),
  location_in_camp TEXT,
  
  -- Details
  serial_number TEXT,
  model_number TEXT,
  manufacturer TEXT,
  
  -- Purchase & Warranty
  purchase_date DATE,
  purchase_cost NUMERIC,
  warranty_expiry_date DATE,
  
  -- Status & Files
  status TEXT DEFAULT 'active',
  notes TEXT,
  attachments_urls TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-enable RLS policy for the new table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on assets" ON assets;
CREATE POLICY "Public full access on assets" ON assets FOR ALL USING (true) WITH CHECK (true);

COMMIT;
