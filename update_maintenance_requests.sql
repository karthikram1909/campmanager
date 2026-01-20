
-- Run this script in your Supabase SQL Editor to update the maintenance_requests table.

BEGIN;

ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS issue_description TEXT, -- Frontend uses 'issue_description'
ADD COLUMN IF NOT EXISTS date_reported DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS reported_by TEXT;

-- Frontend seems to map 'description' to 'issue_description' for assets in some places, 
-- or uses 'description' for rooms. We add 'issue_description' to be safe as per state dump variables.

COMMIT;
