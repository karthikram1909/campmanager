# Supabase Authentication Setup Guide

To enable Google Authentication and Email OTP for your application, you need to configure your Supabase Project.

## 1. Run the Database Setup
1. Open your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Create a **New Query**.
4. Copy the content of the file `active_workspace/setup_auth.sql` (or see below) and paste it into the query editor.
5. Click **Run**.

**SQL to Run:**
```sql
-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 4. Function & Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable Technicians RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all technicians" ON technicians FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
CREATE POLICY "Technicians view own record" ON technicians FOR SELECT USING (email = auth.jwt() ->> 'email');
```

## 2. Enable Google Authentication
1. Go to **Authentication** -> **Providers** in the Supabase Dashboard.
2. Click on **Google**.
3. Toggle "Enable Google".
4. You need a **Client ID** and **Client Secret** from Google Cloud Console.
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project.
   - Go to APIs & Services -> Credentials -> Create Credentials -> OAuth Client ID.
   - Application Type: **Web application**.
   - **Authorized JavaScript Origins**: `https://<your-project>.supabase.co` (Found in Supabase Settings) and `http://localhost:5173` (for local dev).
   - **Authorized Redirect URIs**: `https://<your-project>.supabase.co/auth/v1/callback`.
5. Copy Client ID and Secret to Supabase.

## 3. Enable Email Magic Link (OTP)
1. Go to **Authentication** -> **Providers** -> **Email**.
2. Ensure **Enable Email provider** is ON.
3. Keep "Confirm email" enabled (standard).
4. Users will receive a Magic Link to sign in.

## 4. Admin Access
By default, all new users are just 'users'. To make yourself an admin:
1. Sign up/Login to the app once.
2. In Supabase Dashboard -> **Table Editor** -> `profiles` table.
3. Find your row and change the `role` column from `user` to `admin`.
4. Now you will have full access.

## Next Steps
- Restart your development server if needed.
- Navigate to `/Login` (or try to access a protected page) to test.
