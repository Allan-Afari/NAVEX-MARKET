# Navex Market

Deal collaboration platform — marketplace, deal rooms, messaging, documents, billing, and admin tooling.

**Stack:** React 18 · Vite · TypeScript · Tailwind · shadcn/ui · Supabase · Capacitor (Android)

## Quick start

```powershell
npm install
copy .env.example .env
copy .env.local.example .env.local
# Fill in Supabase credentials, then:
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Supabase anon key |
| `VITE_SENTRY_DSN` | Client | Error reporting (optional) |
| `VITE_ENABLE_OFFLINE_MODE` | Client | Mock Supabase for local dev |
| `RESEND_API_KEY` | Edge Function | Outbound email via Resend |
| `APP_URL` | Edge Function | Links in email templates |
| `SMILE_PARTNER_ID` | Edge Function | Smile ID KYC |
| `SMILE_API_KEY` | Edge Function | Smile ID + webhook HMAC |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Server-side DB access |

See `.env.example` and `.env.local.example` for the full list.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run test` | Vitest unit tests |
| `npm run e2e:test` | Playwright e2e (after `npm run e2e:install`) |
| `npm run supabase:start` | Local Supabase stack |
| `npm run docker:compose:up` | Docker + nginx production image |

## Project layout

```
src/
  pages/          Route-level screens
  components/     UI and feature components
  lib/            Business logic and integrations
  integrations/   Supabase client and generated types
supabase/
  migrations/     Database schema + RLS
  functions/      Edge Functions (email, KYC, payments)
android/          Capacitor Android shell
docs/
  SUPABASE.md     Backend setup and verification checklist
  archive/        Legacy planning docs (historical reference)
```

## Key routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page |
| `/marketplace` | Auth | Deal search and discovery |
| `/deal-rooms` | Auth | Deal room list |
| `/deal-room/:id` | Auth | Room detail (chat, docs, disputes) |
| `/reputation` | Auth | Reviews and disputes |
| `/admin` | Admin | User/deal/dispute management |
| `/auth/callback` | Public | Email confirmation handler |

## Supabase

Apply migrations to your project (local or remote), then deploy Edge Functions:

```powershell
supabase db push          # remote
supabase functions deploy send-email-notification
supabase functions deploy smile-id-webhook
supabase functions deploy smile-id-create-session
```

See [docs/SUPABASE.md](docs/SUPABASE.md) for the full verification checklist.

## Mobile

```powershell
npm run build
npx cap sync android
npx cap open android
```

## Testing

```powershell
npm run test              # 79 unit tests
npm run build             # must pass before deploy
```

## Archived documentation

Earlier AI-generated planning docs (launch checklists, integration guides, competitive analysis) live in `docs/archive/`. They are historical context only — **this README and `docs/SUPABASE.md` are the source of truth.**

## License

See [LICENSE](LICENSE).
