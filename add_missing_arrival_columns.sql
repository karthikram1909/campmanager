ALTER TABLE "technicians" 
ADD COLUMN IF NOT EXISTS "legal_nominee_name" text,
ADD COLUMN IF NOT EXISTS "nominee_relationship" text,
ADD COLUMN IF NOT EXISTS "work_experience_uae" text,
ADD COLUMN IF NOT EXISTS "work_experience_other" text,
ADD COLUMN IF NOT EXISTS "language_preference" text;
