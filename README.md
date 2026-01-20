# Camp Management System

## Overview
This project has been migrated from Base44 to a standalone React application using Supabase as the backend.

## Prerequisites
1. Node.js installed.
2. A Supabase project (Free tier works).

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Run the database migration script:
   - Go to your Supabase Dashboard > SQL Editor.
   - Run the contents of `supabase_schema.sql` located in the project root.

## Development
Run the local development server:
```bash
npm run dev
```

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: Supabase (Auth + Database + Storage)
- **Adapter**: `src/services/db.js` adapts the legacy Base44 API calls to Supabase, ensuring minimal code changes were needed in the UI components.

## Auth
Authentication is handled via Supabase Auth. Ensure email/password provider is enabled in your Supabase project.
