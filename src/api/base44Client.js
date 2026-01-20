// Migrated to Supabase Adapter
// This file acts as a bridge to allow existing code importing 'base44' to work with the new Supabase implementation.
import { db } from '@/services/db';

export const base44 = db;
