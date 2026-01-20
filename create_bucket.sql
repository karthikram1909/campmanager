
-- Run this script in your Supabase SQL Editor to create the storage bucket.

BEGIN;

-- 1. Create the 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow public uploads/reads/deletes for this bucket
-- Note: In production you should restrict this, but for dev/demo this unblocks you.
DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;

CREATE POLICY "Public Access Documents"
ON storage.objects FOR ALL
USING ( bucket_id = 'documents' )
WITH CHECK ( bucket_id = 'documents' );

COMMIT;
