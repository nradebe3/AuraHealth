# Aura Health - Shared Test Project

This package contains the Expo / React Native application for testing against the **existing Supabase project**. No database installation or migration is required to start the app.

## Quick start

1. Install Node.js and npm.
2. Extract the ZIP and open a terminal in `AuraHealth`.
3. Run `npm ci`.
4. Run `npx expo start --web` to test in a browser, or `npx expo start` for supported mobile testing.
5. Sign in with a **test account already provisioned** in the shared Supabase project.

The included `.env` contains only the public Supabase URL and public anon key. It does not contain server-side credentials. These public values are intended for client applications, but access to data must still be enforced by Supabase RLS and server-side authorization.

## What is included

- App screens and navigation (`app/`)
- Shared components, authentication and Supabase client (`src/`)
- Required assets and Expo / TypeScript configuration
- Dependency manifest and lockfile
- Public client environment configuration

## What is deliberately excluded

- Historical SQL scripts and database migration files
- Deployed Supabase Edge Function source and CLI metadata
- Old implementation notes, troubleshooting documents, backups and logs
- Service-role key, encryption secret, and any private server credentials

The existing hosted Supabase functions and database remain in place. This ZIP does **not** redeploy or modify them.

## Testing notes

- All testers connect to the **same live Supabase project**. Use fictional test patient data only, not real patient information.
- Ask the project owner for a test login with the role you need (patient, clinician, admin, etc.).
- Testers' changes may be visible to other testers. Avoid deleting shared records.
- The clinician triage screen uses manual clinician-selected categories; it does not calculate an automatic SATS score.
- Do not distribute this package publicly or commit `.env` to a public repository.
- If you need isolated testing, use a separate Supabase project rather than the shared database.

## Developer notes

- `src/lib/supabase.ts` initializes the Supabase client and session storage.
- `src/hooks/useAuth.tsx` loads authentication state and user roles.
- `src/components/RoleGuard.tsx` guards role-specific screens.
- `app/(clinician)/triage.tsx` handles manual triage data entry and saving.
