# Plan: Move OFM to Supabase (real auth + per-company database)

Replace the localStorage `ofm-store` mock layer with a real Supabase backend: Supabase Auth for login, multi-tenant tables scoped per company, RLS for access control, and TanStack server functions for privileged actions (admin creating staff). No seed data — you register a company and build from there.

## 1. Fix the broken build first
`@supabase/supabase-js` is imported but not installed, which is currently breaking the build/preview. Install it as the first step.

## 2. Database schema (Supabase migration)

Tables (all in `public`, all multi-tenant via `company_id`):

```text
companies     id, name, type, wifi_password, created_at
profiles      id (= auth.users.id), company_id, full_name, email, created_at
user_roles    id, user_id, company_id, role (enum)
tasks         id, company_id, title, description, roles[], created_by, created_by_name, status, created_at
leaves        id, company_id, user_id, name, reason, status, created_at
attendance    id, company_id, user_id, user_name, date, check_in, check_out
```

- `app_role` enum: `admin | manager | sales | developer`.
- Roles live in a dedicated `user_roles` table (never on profiles) with a `has_role()` SECURITY DEFINER function, plus a `same_company()` SECURITY DEFINER helper that returns the caller's `company_id` to avoid recursive RLS.
- Every table gets explicit GRANTs (authenticated + service_role) and RLS enabled.

### Access rules (RLS, plain English)
- Users only ever see rows belonging to **their own company**.
- **Admin**: full create/edit/delete on staff (profiles + roles), tasks, leaves, attendance, and company settings (Wi-Fi).
- **Manager**: read-only on staff; can create tasks, approve/reject leaves, view attendance, manage own attendance.
- **Sales/Developer**: see tasks matching their role, create tasks for their role, manage their own attendance and leave requests.

## 3. Auth flow

- **Register Company** (landing tab): `supabase.auth.signUp` with the admin's email/password, passing `full_name`, `company_name`, `company_type` as metadata. A DB trigger (`handle_new_user`) runs on signup: if metadata contains a company name it creates the `companies` row, the admin `profiles` row, and an `admin` entry in `user_roles`. Redirect to `/dashboard`.
- **Staff Sign-In** (landing tab): `supabase.auth.signInWithPassword`.
- **Admin creates staff**: a protected server function (`createStaff`) using `requireSupabaseAuth` + admin role check, then `supabaseAdmin.auth.admin.createUser` to mint the account, and inserts the profile + role with the admin's `company_id`. (Staff accounts can't be created client-side securely.)
- Auto-confirm email is assumed on so newly created staff can log in immediately; I'll note if email confirmation needs disabling in Supabase Auth settings.

## 4. Code changes

- **Install** `@supabase/supabase-js` (fixes build).
- **Rewrite `src/lib/ofm-store.tsx`**: keep the same `useOFM()` API surface (so `Dashboard.tsx`, `Chatbot.tsx`, `index.tsx` need minimal changes), but back it with Supabase — session via `onAuthStateChange`, data via TanStack Query against server functions, mutations that write to Supabase and invalidate caches. `currentUser`, `users`, `tasks`, `leaves`, `attendance`, `wifiPassword` come from the DB.
- **Server functions** (`src/lib/ofm.functions.ts`): `createStaff`, `updateStaff`, `deleteStaff` (admin-only, service role), plus any reads that need elevated access. User-scoped reads/writes (tasks, leaves, attendance, leave approval) go through the authenticated browser client with RLS.
- **Auth gating**: move the dashboard under the integration-managed `_authenticated` layout (or keep the existing client-side guard) so unauthenticated users redirect to the landing page.
- **Wire `attachSupabaseAuth`** into `src/start.ts` so protected server functions receive the bearer token.
- **Chatbot leave form** now inserts into the `leaves` table (real), so it shows up in the manager's pending list live. Wi-Fi password is read from the `companies` row instead of local state.
- Landing `index.tsx`: register/sign-in handlers call Supabase instead of the mock store.

## 5. Verification
- Typecheck + build pass.
- Register a company, confirm admin lands on dashboard and a `companies`/`profiles`/`user_roles` row exists.
- Admin creates a staff account; staff signs in; sees only role-relevant tasks.
- Submit a leave via chatbot; confirm it appears in manager's pending table.
- Confirm cross-company isolation (one company can't see another's data).

## Technical notes
- This stack uses TanStack Start server functions, **not** Supabase edge functions, for app logic.
- After the migration runs, I'll address any Supabase linter warnings related to the new tables.
- You'll need authentication working before any data shows — that's built into this plan.

## Open consideration
The current chatbot `sendChat` already passes role/companyType/wifiPassword from the store; after migration those values come from the DB-backed store, so no signature change is needed there.
