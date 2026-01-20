-- 1. Insert the user into the profiles table if they are missing
-- We copy the user's ID and Email from the system's auth table into your public profiles table
INSERT INTO public.profiles (id, email, role, full_name)
SELECT 
    id, 
    email, 
    'admin',                                     -- Set role to Admin
    COALESCE(raw_user_meta_data->>'full_name', 'Admin User')  -- Try to get name, or default
FROM auth.users
WHERE email = '2210030135cse@gmail.com'
ON CONFLICT (id) DO UPDATE                       -- If they already exist, just update the role
SET role = 'admin';

-- 2. Verify the fix
SELECT * FROM public.profiles WHERE email = '2210030135cse@gmail.com';
