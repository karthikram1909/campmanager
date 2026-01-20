-- Run this script in your Supabase SQL Editor (Table Editor -> SQL Query)

-- 1. Make your user an Admin
UPDATE profiles
SET role = 'admin'
WHERE email = '2210030135cse@gmail.com';

-- 2. Verify the update (Optional, just to show the result)
SELECT * FROM profiles WHERE email = '2210030135cse@gmail.com';
