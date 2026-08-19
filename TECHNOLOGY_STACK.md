# Prosventa Technology Stack

## Framework
- **Next.js** (App Router is likely, given the modern setup)

## Backend / Database
- **Supabase** (PostgreSQL)
  - Extensive use of Supabase migrations (`supabase/migrations/`)
  - **PostgreSQL** database with row-level security (RLS) policies
  - Auth managed by Supabase Auth
  - Tables include organizations, profiles, memberships, triggers for onboarding

## Scripts (Development Tools)
- Node.js / Python scripts for:
  - Database migrations (`apply_migration.py`)
  - Policy verification (`verify_*.py`, `check_*.py` scripts)
  - SQL inspection (`inspect_db.py`, `inspect_policies.sql`)
  - Supabase CLI usage via MCP server

## Key Infrastructure
- Supabase PostgreSQL database
  - Organizations table
  - Profiles table
  - Memberships table
  - Row Level Security (RLS) policies
  - Database triggers (e.g., auth trigger)
- TypeScript/JavaScript (Next.js)

## DevOps
- **Package**: `prosventa` (private)
- **Version**: 0.1.0
- **Scripts**: `dev`, `build`, `start`, `lint` (Next.js standard)
</task_progress>