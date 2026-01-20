# Supabase Migration Plan

## Overview
This document outlines the steps to migrate the "Camp-Imp Project" from Base44 to Supabase.

## 1. Environment Setup
- [x] Install `@supabase/supabase-js`.
- [ ] Create `src/lib/supabaseClient.js`.
- [ ] Configure environment variables in `.env` and `.env.local` (SUPABASE_URL, SUPABASE_ANON_KEY).

## 2. Database Schema
We will create a PostgreSQL schema that mirrors the entities used in the application.
**Proposed Tables:**
- `camps`
- `floors`
- `rooms`
- `beds`
- `technicians`
- `external_personnel`
- `documents` (split into `technician_documents` and `camp_documents` or users/types)
- `leave_requests`
- `transfer_requests`
- `maintenance_requests`
- `disciplinary_actions`
- `visitors`
- `roles`
- `user_roles`
- `attendance`

## 3. Authentication
- Replace `src/lib/AuthContext.jsx` to use `supabase.auth`.
- Remove `base44.auth.me()` calls.

## 4. Data Layer Refactoring
We will create a new service layer `src/services/db.js` that exposes the same methods the app currently expects (e.g., `list`, `create`, `update`, `delete`) but maps them to Supabase queries.

**Strategy:**
Instead of rewriting every component immediately, we will create an adapter that allows us to switch the import.
Old: `import { base44 } from "@/api/base44Client";`
New: `import { db } from "@/services/db";`

The `db` object will have the same structure:
```javascript
export const db = {
  auth: { ... },
  entities: {
    Camp: { list: () => supabase.from('camps').select('*'), ... },
    Technician: { ... },
    // ...
  }
};
```
This allows for a smoother transition. Once working, we can refactor components to use `supabase` directly if preferred, or keep this clean abstraction layer.

## 5. Cleanup
- Uninstall Base44 packages.
- Remove `base44` specific config files.
