-- Pickup & Verification Columns
ALTER TABLE "technicians" 
ADD COLUMN IF NOT EXISTS "pickup_driver_name" text,
ADD COLUMN IF NOT EXISTS "pickup_vehicle_number" text,
ADD COLUMN IF NOT EXISTS "pickup_driver_mobile" text,
ADD COLUMN IF NOT EXISTS "pickup_name_verified" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "pickup_passport_verified" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "pickup_refreshment_served" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "pickup_photo_url" text,
ADD COLUMN IF NOT EXISTS "pickup_passport_attachment_url" text,
ADD COLUMN IF NOT EXISTS "pickup_verification_date" date,
ADD COLUMN IF NOT EXISTS "pickup_verification_time" time;

-- Contact & Emergency Columns
ALTER TABLE "technicians" 
ADD COLUMN IF NOT EXISTS "whatsapp_mobile" text,
ADD COLUMN IF NOT EXISTS "secondary_whatsapp" text,
ADD COLUMN IF NOT EXISTS "emergency_contact_no_2" text,
ADD COLUMN IF NOT EXISTS "emergency_contact_no_2_relationship" text,
ADD COLUMN IF NOT EXISTS "legal_nominee_name" text,
ADD COLUMN IF NOT EXISTS "nominee_relationship" text,
ADD COLUMN IF NOT EXISTS "legal_nominee_attachment_url" text;

-- Arrival & Induction Columns
ALTER TABLE "technicians" 
ADD COLUMN IF NOT EXISTS "actual_arrival_date" date,
ADD COLUMN IF NOT EXISTS "actual_arrival_time" time,
ADD COLUMN IF NOT EXISTS "meal_preference_id" uuid,
ADD COLUMN IF NOT EXISTS "biometric_capture_date" date,
ADD COLUMN IF NOT EXISTS "biometric_capture_time" time,
ADD COLUMN IF NOT EXISTS "sajja_induction_start_date" date,
ADD COLUMN IF NOT EXISTS "induction_status" text,
ADD COLUMN IF NOT EXISTS "work_experience_uae" text,
ADD COLUMN IF NOT EXISTS "work_experience_other" text,
ADD COLUMN IF NOT EXISTS "language_preference" text;
