# Navex Market

A hybrid web and mobile deal-collaboration platform built with React, Vite, TypeScript, Tailwind, Supabase, and Capacitor.

## Getting started

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Copy environment examples:
   ```powershell
   copy .env.example .env
   copy .env.local.example .env.local
   ```
3. Update `.env` and `.env.local` with your Supabase and service credentials.
4. Keep `.env` and `.env.local` out of source control; these files are already ignored by `.gitignore`.
4. Start the app:
   ```powershell
   npm run dev
   ```

## Environment variables

The app uses the following environment variables:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public API key
- `VITE_SENTRY_DSN` — Sentry DSN for production error reporting
- `RESEND_API_KEY` — Resend API key for outbound email notifications
- `APP_URL` — Public application URL used in email links
- `SMILE_API_KEY` — Smile ID webhook signature secret for verification
- `VITE_ENABLE_OFFLINE_MODE` — set to `true` to enable local fetch interception for development/testing

Server or function-only variables:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for server-side functions only

## Build

```powershell
npm run build
```

## Testing

```powershell
npm run test
```

## Supabase

This app uses Supabase for database and auth. Local Supabase commands:

```powershell
npm run supabase:start
npm run supabase:stop
npm run supabase:status
```

## Key documentation

- `START_HERE_README.md` – product status and launch summary
- `CODE_REFERENCE_GUIDE.md` – code/service reference
- `LAUNCH_CHECKLIST_AND_TESTING.md` – launch and QA plan
- `DOCUMENTATION_INDEX.md` – documentation map

## Notes

- The repository was cleaned to remove generated artifacts and legacy binary/archive files.
- Keep `.env` and local secrets out of version control.
