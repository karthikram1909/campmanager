ALTER TABLE "technicians" 
ADD COLUMN IF NOT EXISTS "secondary_whatsapp" text,
ADD COLUMN IF NOT EXISTS "emergency_contact_no_2" text,
ADD COLUMN IF NOT EXISTS "emergency_contact_no_2_relationship" text,
ADD COLUMN IF NOT EXISTS "legal_nominee_attachment_url" text;
