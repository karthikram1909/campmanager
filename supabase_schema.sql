-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Camps
-- Added current_occupancy and camp_type to match Frontend expectations
CREATE TABLE camps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  location TEXT,
  capacity INTEGER,
  current_occupancy INTEGER DEFAULT 0,
  camp_type TEXT, -- 'induction_camp', 'regular_camp', 'exit_camp'
  latitude FLOAT,
  longitude FLOAT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Floors
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camp_id UUID REFERENCES camps(id) ON DELETE CASCADE,
  floor_number TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  gender_restriction TEXT, -- 'male', 'female', 'mixed'
  occupant_type TEXT, -- 'technician_only', 'external_only', 'mixed'
  nationality_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Beds
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- 'available', 'occupied', 'protected', 'maintenance'
  is_lower_berth BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Technicians
-- 5. Technicians
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  
  -- Demographics
  nationality TEXT,
  gender TEXT,
  date_of_birth DATE,
  religion TEXT,
  marital_status TEXT,
  ethnicity TEXT, -- Added
  
  -- Contact
  phone TEXT,
  email TEXT,
  state TEXT, -- Home state/province
  
  -- Assignment
  camp_id UUID REFERENCES camps(id),
  bed_id UUID REFERENCES beds(id),
  trade TEXT,
  department TEXT,
  tentative_project_id UUID,
  
  -- Family
  no_of_adults INTEGER DEFAULT 0,
  no_of_children INTEGER DEFAULT 0,
  no_of_infants INTEGER DEFAULT 0,
  
  -- Documents (Metadata)
  passport_no TEXT,
  passport_expiry_date DATE,
  health_insurance_no TEXT,
  health_insurance_expiry_date DATE,
  
  -- Travel / Arrival
  expected_arrival_date DATE,
  expected_arrival_time TIME,
  flight_number TEXT,
  airline TEXT,
  departure_airport TEXT,
  arrival_airport TEXT,
  arrival_terminal TEXT,
  ticket_ref TEXT,
  
  -- Induction & Exit
  induction_status TEXT,
  induction_date DATE, -- Added
  camp_induction_required BOOLEAN DEFAULT true,
  camp_induction_completed BOOLEAN DEFAULT false,
  
  exit_date DATE, -- Employment Exit Date (Added)
  expected_country_exit_date DATE, -- Added
  actual_country_exit_date DATE, -- Added
  
  -- Emergency
  emergency_contact_no TEXT,
  emergency_contact_no_relationship TEXT,
  emergency_contact_no_2 TEXT,
  emergency_contact_no_2_relationship TEXT,
  legal_nominee_name TEXT,
  nominee_relationship TEXT,
  
  -- Internal
  pickup_status TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. External Personnel
-- 6. External Personnel
CREATE TABLE external_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  company_name TEXT,
  role TEXT,
  gender TEXT,
  contact_number TEXT,
  email TEXT,
  nationality TEXT,
  ethnicity TEXT,
  emirates_id TEXT,
  
  status TEXT DEFAULT 'active',
  camp_id UUID REFERENCES camps(id),
  bed_id UUID REFERENCES beds(id),
  
  contract_start_date DATE,
  contract_end_date DATE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Documents (Consolidated)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'technician', 'camp'
  entity_id UUID NOT NULL, 
  document_type TEXT NOT NULL, 
  document_name TEXT,
  document_number TEXT,
  issuing_authority TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Leave Requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID REFERENCES technicians(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Transfer Requests
-- 9. Transfer Requests
CREATE TABLE transfer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_camp_id UUID REFERENCES camps(id),
  target_camp_id UUID REFERENCES camps(id),
  
  -- Support for bulk transfers
  technician_ids UUID[], -- Array of technician IDs
  external_personnel_ids UUID[], -- Array of external personnel IDs
  
  requested_by UUID, -- User ID
  status TEXT DEFAULT 'pending_allocation', -- pending_allocation, beds_allocated, approved_for_dispatch, dispatched, completed, cancelled
  
  request_date DATE DEFAULT CURRENT_DATE,
  reason_for_movement TEXT,
  scheduled_dispatch_date DATE,
  scheduled_dispatch_time TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Maintenance Requests
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camp_id UUID REFERENCES camps(id),
  room_id UUID REFERENCES rooms(id),
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Disciplinary Actions
CREATE TABLE disciplinary_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID REFERENCES technicians(id),
  action_type TEXT NOT NULL,
  description TEXT,
  action_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  visitor_type TEXT,
  company_name TEXT,
  contact_number TEXT,
  email TEXT,
  
  -- ID Details
  id_document_type TEXT,
  id_document_number TEXT,
  
  -- Visit Details
  purpose_of_visit TEXT,
  camp_id UUID REFERENCES camps(id),
  host_contact_person TEXT,
  access_areas TEXT, -- This was the missing column causing the error
  
  -- Timing
  check_in_date DATE DEFAULT CURRENT_DATE,
  check_in_time TIME,
  expected_checkout_date DATE,
  check_out_date DATE,
  check_out_time TIME,
  
  -- Logistics
  vehicle_number TEXT,
  items_brought_in TEXT,
  
  -- Status & Meta
  status TEXT DEFAULT 'checked_in', -- 'checked_in', 'checked_out'
  safety_briefing_given BOOLEAN DEFAULT false,
  notes TEXT,
  registered_by UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_tag TEXT, -- Was asset_id
  name TEXT NOT NULL, -- Was asset_name
  type TEXT, -- Was asset_type
  camp_id UUID REFERENCES camps(id),
  location_in_camp TEXT,
  
  -- Details
  serial_number TEXT,
  model_number TEXT,
  manufacturer TEXT,
  
  -- Purchase & Warranty
  purchase_date DATE,
  purchase_cost NUMERIC,
  warranty_expiry_date DATE,
  
  -- Status & Files
  status TEXT DEFAULT 'active',
  notes TEXT,
  attachments_urls TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID REFERENCES technicians(id),
  date DATE NOT NULL,
  status TEXT, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Roles & Permissions (Simple RBAC)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  permissions TEXT[] 
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  role_id UUID REFERENCES roles(id),
  camp_id UUID REFERENCES camps(id) 
);

-- Projects Table (Simple)
-- Projects Table
CREATE TABLE projects (
   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
   project_name TEXT NOT NULL,
   project_code TEXT,
   
   -- Additional fields
   sou TEXT,
   description TEXT,
   client_name TEXT,
   location TEXT,
   status TEXT DEFAULT 'active',
   start_date DATE,
   end_date DATE,
   notes TEXT,
   
   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) - PUBLIC ACCESS FOR SETUP
-- WARNING: This is for initial setup/migration only.
-- In production, you should lock this down to authenticated users.

ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on camps" ON camps FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on technicians" ON technicians FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on floors" ON floors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on beds" ON beds FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS for other tables as 'public read/write' for simplicity during this migration phase
-- You should delete these policies and replace with authenticated-only access later.

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on documents" ON documents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on assets" ON assets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- 17. Hospitals
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  phone TEXT,
  emergency_number TEXT,
  email TEXT,
  contact_person TEXT,
  specialties TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on hospitals" ON hospitals FOR ALL USING (true) WITH CHECK (true);
-- 18. Meal Preferences
CREATE TABLE meal_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT, -- 'veg', 'non_veg'
  cuisine TEXT, -- 'african', 'pakistani', 'south_indian', 'north_indian', 'isolation'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE meal_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on meal_preferences" ON meal_preferences FOR ALL USING (true) WITH CHECK (true);
-- 19. Pre-Induction Parties
CREATE TABLE induction_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_name TEXT NOT NULL,
  sequence_order INTEGER,
  depends_on_party_id UUID REFERENCES induction_parties(id),
  description TEXT,
  attachment_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE induction_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on induction_parties" ON induction_parties FOR ALL USING (true) WITH CHECK (true);

-- 20. Pre-Induction Task Templates
CREATE TABLE induction_task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID REFERENCES induction_parties(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_order INTEGER,
  is_mandatory BOOLEAN DEFAULT true,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE induction_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on induction_task_templates" ON induction_task_templates FOR ALL USING (true) WITH CHECK (true);

-- 21. Technician Transfer Logs
CREATE TABLE technician_transfer_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_date DATE DEFAULT CURRENT_DATE,
  transfer_time TEXT,
  technician_id UUID REFERENCES technicians(id),
  external_personnel_id UUID REFERENCES external_personnel(id),
  from_camp_id UUID REFERENCES camps(id),
  to_camp_id UUID REFERENCES camps(id),
  from_bed_id UUID REFERENCES beds(id),
  to_bed_id UUID REFERENCES beds(id),
  reason_for_movement TEXT,
  transferred_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE technician_transfer_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on technician_transfer_logs" ON technician_transfer_logs FOR ALL USING (true) WITH CHECK (true);

-- 22. Transfer Schedule Policies
CREATE TABLE transfer_schedule_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_name TEXT NOT NULL,
  policy_type TEXT DEFAULT 'dispatch_schedule', -- 'dispatch_schedule', 'initiation_control'
  start_date DATE NOT NULL, -- Stored as current year date, but logic uses MM-DD
  end_date DATE NOT NULL,   -- Stored as current year date, but logic uses MM-DD
  
  allowed_days TEXT[] DEFAULT '{}', -- ['Monday', 'Tuesday', ...]
  allowed_time_slots TEXT[] DEFAULT '{}', -- ['09:00', '14:00', ...]
  
  allowed_transfer_reasons TEXT[] DEFAULT '{}', -- Empty means all allowed
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transfer_schedule_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on transfer_schedule_policies" ON transfer_schedule_policies FOR ALL USING (true) WITH CHECK (true);
