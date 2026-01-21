import { supabase } from '@/lib/supabaseClient';

// Helper to convert PascalCase to snake_case for table names
const toTableName = (entityName) => {
    const mapping = {
        Camp: 'camps',
        Floor: 'floors',
        Room: 'rooms',
        Bed: 'beds',
        Technician: 'technicians',
        ExternalPersonnel: 'external_personnel',
        TechnicianDocument: 'documents', // Mapped to shared 'documents' table
        CampDocument: 'documents',       // Mapped to shared 'documents' table
        LeaveRequest: 'leave_requests',
        TransferRequest: 'transfer_requests',
        MaintenanceRequest: 'maintenance_requests',
        DisciplinaryAction: 'disciplinary_actions',
        Visitor: 'visitors',
        Asset: 'assets',
        Attendance: 'attendance',
        Role: 'roles',
        UserRole: 'user_roles',
        User: 'profiles', // Ensure User entity maps to profiles table
        MealPreferenceChangeRequest: 'meal_preference_changes',
        MealPreference: 'meal_preferences',
        Hospital: 'hospitals',
        Project: 'projects',
        InductionParty: 'induction_parties',
        InductionTaskTemplate: 'induction_task_templates',
        Transaction: 'transactions',
        Event: 'events',
        EventRegistration: 'event_registrations',
        TransferSchedulePolicy: 'transfer_schedule_policies',
        TechnicianTransferLog: 'technician_transfer_logs',
        MaintenanceSchedule: 'maintenance_schedules',
        MaintenanceLog: 'maintenance_logs',
        // Fallback for others
        MedicalRecord: 'medical_records',
        InsuranceClaim: 'insurance_claims',
        HealthInsurancePolicy: 'health_insurance_policies',
        DisciplinaryActionType: 'disciplinary_action_types',

        DailyStatus: 'daily_status',
        CampHiringRequest: 'camp_hiring_requests',
        CampAudit: 'camp_audits',
        ProcurementDecision: 'procurement_decisions',
        SlaPolicy: 'sla_policies',
        SlaLog: 'sla_logs',
    };
    return mapping[entityName] || entityName.toLowerCase() + 's';
};

// Generic CRUD handler generator
const createEntityHandler = (entityName) => {
    const tableName = toTableName(entityName);

    return {
        list: async () => {
            let query = supabase.from(tableName).select('*');

            // Filter by entity_type for shared tables
            if (entityName === 'TechnicianDocument') {
                query = query.eq('entity_type', 'technician');
            } else if (entityName === 'CampDocument') {
                query = query.eq('entity_type', 'camp');
            }

            const { data, error } = await query;
            if (error) {
                console.error(`Error listing ${entityName}:`, error);
                throw error;
            }

            // Map entity_id back to specific IDs for shared tables
            if (data && (entityName === 'TechnicianDocument' || entityName === 'CampDocument')) {
                return data.map(item => {
                    const mapped = { ...item };
                    if (entityName === 'TechnicianDocument') mapped.technician_id = item.entity_id;
                    if (entityName === 'CampDocument') mapped.camp_id = item.entity_id;
                    return mapped;
                });
            }

            return data || [];
        },

        filter: async (filters) => {
            let query = supabase.from(tableName).select('*');

            // Inject entity_type for shared tables
            if (entityName === 'TechnicianDocument') {
                query = query.eq('entity_type', 'technician');
            } else if (entityName === 'CampDocument') {
                query = query.eq('entity_type', 'camp');
            }

            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data, error } = await query;
            if (error) {
                console.error(`Error filtering ${entityName}:`, error);
                throw error;
            }

            // Map entity_id back to specific IDs for shared tables
            if (data && (entityName === 'TechnicianDocument' || entityName === 'CampDocument')) {
                return data.map(item => {
                    const mapped = { ...item };
                    if (entityName === 'TechnicianDocument') mapped.technician_id = item.entity_id;
                    if (entityName === 'CampDocument') mapped.camp_id = item.entity_id;
                    return mapped;
                });
            }

            return data || [];
        },

        create: async (data) => {
            let payload = { ...data };
            // Inject entity_type and map IDs for shared tables
            if (entityName === 'TechnicianDocument') {
                payload.entity_type = 'technician';
                if (payload.technician_id) {
                    payload.entity_id = payload.technician_id;
                    delete payload.technician_id;
                }
            } else if (entityName === 'CampDocument') {
                payload.entity_type = 'camp';
                if (payload.camp_id) {
                    payload.entity_id = payload.camp_id;
                    delete payload.camp_id;
                }
            }

            const { data: created, error } = await supabase
                .from(tableName)
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error(`Error creating ${entityName}:`, error);
                throw error;
            }
            return created;
        },

        update: async (id, data) => {
            const { data: updated, error } = await supabase
                .from(tableName)
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error(`Error updating ${entityName}:`, error);
                throw error;
            }
            return updated;
        },

        delete: async (id) => {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (error) {
                console.error(`Error deleting ${entityName}:`, error);
                throw error;
            }
            return true;
        },

        bulkCreate: async (dataArray) => {
            let payload = dataArray;
            if (entityName === 'TechnicianDocument') {
                payload = dataArray.map(d => {
                    const mapped = { ...d, entity_type: 'technician' };
                    if (mapped.technician_id) {
                        mapped.entity_id = mapped.technician_id;
                        delete mapped.technician_id;
                    }
                    return mapped;
                });
            } else if (entityName === 'CampDocument') {
                payload = dataArray.map(d => {
                    const mapped = { ...d, entity_type: 'camp' };
                    if (mapped.camp_id) {
                        mapped.entity_id = mapped.camp_id;
                        delete mapped.camp_id;
                    }
                    return mapped;
                });
            }

            const { data: created, error } = await supabase
                .from(tableName)
                .insert(payload)
                .select();

            if (error) {
                console.error(`Error bulk creating ${entityName}:`, error);
                throw error;
            }
            return created;
        }
    };
};

// List of all entities used in the application
const entitiesList = [
    'Camp', 'Floor', 'Room', 'Bed', 'Technician', 'ExternalPersonnel',
    'TechnicianDocument', 'CampDocument', 'LeaveRequest', 'TransferRequest',
    'MaintenanceRequest', 'DisciplinaryAction', 'Visitor', 'Asset', 'Attendance',
    'Role', 'UserRole', 'MealPreferenceChangeRequest', 'User',
    'Project', 'Hospital', 'MealPreference', 'Transaction',
    'Event', 'EventRegistration',
    'InductionParty', 'InductionTaskTemplate', 'TechnicianTransferLog', 'TransferSchedulePolicy',
    'MaintenanceSchedule', 'MaintenanceLog',

    'MedicalRecord', 'InsuranceClaim', 'HealthInsurancePolicy', 'DisciplinaryActionType', 'DailyStatus',
    'CampHiringRequest', 'CampAudit', 'ProcurementDecision',
    'SlaPolicy', 'SlaLog'
];

// Build the entities object
const entities = {};
entitiesList.forEach(name => {
    entities[name] = createEntityHandler(name);
});

// Auth Adapter
const auth = {
    me: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error('User not authenticated');

        // Fetch profile to get role - SAFETY CHECK: Don't crash if profile doesn't exist
        let role = 'user';
        try {
            console.log("Fetching profile for user:", user.id);
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError) console.error("Profile fetch error:", profileError);
            console.log("Profile data:", profile);

            if (profile && profile.role) {
                role = profile.role;
            }
            console.log("Resolved role:", role);
        } catch (err) {
            console.warn('Profile fetch failed, defaulting to user role', err);
        }

        // EMERGENCY OVERRIDE: Force admin for your specific email
        // This bypasses any database/RLS issues that might be hiding the role
        const adminEmails = ['2210030135cse@gmail.com', 'kapparlakarthikrama2004@gmail.com'];
        if (user.email && adminEmails.includes(user.email)) {
            console.log("Applying Admin Override for:", user.email);
            role = 'admin';
        }

        // Map Supabase User to expected App User structure
        return {
            id: user.id,
            email: user.email,
            role: role,
            ...user.user_metadata
        };
    },
    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
    },
    signInWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
        return data;
    },
    signInWithOtp: async (email) => {
        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
        return data;
    },
    logout: async (redirectUrl) => {
        await supabase.auth.signOut();
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            window.location.reload();
        }
    },
    redirectToLogin: (redirectUrl) => {
        window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl || window.location.href)}`;
    },
    onAuthStateChange: (callback) => {
        return supabase.auth.onAuthStateChange(callback);
    }
};

const integrations = {
    Core: {
        UploadFile: async ({ file }) => {
            const bucket = 'documents'; // Default to documents bucket
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Ensure bucket exists or handle error naturally (Supabase won't auto-create from client typically)
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (error) {
                console.error("Storage upload error:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return { file_url: publicUrl };
        }
    }
};

const appLogs = {
    logUserInApp: async (pageName) => {
        // console.log(`[Analytics] User visited ${pageName}`);
        return Promise.resolve();
    }
};

const functions = {
    invoke: async (functionName, body) => {
        const { data, error } = await supabase.functions.invoke(functionName, {
            body: body
        });
        if (error) throw error;
        return data;
    }
};

export const db = {
    entities,
    auth,
    integrations,
    functions,
    appLogs
};


