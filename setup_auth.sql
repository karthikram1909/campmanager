-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies for Profiles
-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 4. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'user') -- Default to user, but allow metadata to override if set by admin function (rare)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Update Technicians RLS (Example of "See details alone")
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- Policy: Admin sees all
CREATE POLICY "Admins view all technicians" ON technicians
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Policy: User sees their own technician record (matching email)
CREATE POLICY "Technicians view own record" ON technicians
  FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
  ); 

-- Note: We use auth.jwt() ->> 'email' which is safer/standard in Supabase policies to get the email of the logged in user.

-- 7. Grant access for authenticated users to other common tables (if they were public before)
-- For now, let's keep the user's request focused. "Admin access all... User see his details alone".
-- We should probably create a policy for EVERY table that filters if it's user-specific, but mostly users only care about their own data, so "Technician" table is the main one. 
-- For other tables like "Camps", "Projects", etc., read-only access for users might be fine, but we'll stick to 'Admin full access, User read-only' or similar if needed.
-- For this step, I'll focus on the specific request: Technician details.

-- Let's make sure the first user (you, presumably) can become an admin.
-- You can manually update your role in the `profiles` table after signing up.
