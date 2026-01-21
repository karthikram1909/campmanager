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
