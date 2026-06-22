# Supabase verification checklist

Use this when standing up a new environment (local, staging, or production).

## 1. Migrations

```powershell
supabase start                    # local
supabase db reset                 # applies all migrations from scratch
# OR for remote:
supabase link --project-ref <ref>
supabase db push
```

**Verify:**

- [ ] All migrations in `supabase/migrations/` apply without error
- [ ] Core tables exist: `profiles`, `deals`, `deal_rooms`, `deal_room_participants`, `disputes`, `notifications`, `email_queue`
- [ ] Unified disputes: `disputes` has `deal_room_id`, `description`, `resolved_at`; `dispute_resolutions` table is dropped after `20260621000000_unify_disputes.sql`

## 2. Row Level Security

| Table | Expected access |
|-------|-----------------|
| `disputes` | Parties, deal-room participants, and admins can read; initiator creates; admins resolve |
| `deal_room_messages` | Participants only (see `20260610000000_harden_deal_chat_rls.sql`) |
| `deal_rooms` | Participants + creator |
| `email_queue` | Service role only (edge function audit) |
| `profiles` | Authenticated read; users update own row |

**Smoke test (as authenticated user):**

```sql
-- Should return only your disputes or deal-room disputes you participate in
SELECT * FROM disputes LIMIT 5;
```

## 3. Edge Functions

Deploy and set secrets in the Supabase dashboard (Project → Edge Functions → Secrets):

### `send-email-notification`

| Secret | Required |
|--------|----------|
| `RESEND_API_KEY` | Yes (for live email) |
| `APP_URL` | Yes |
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |

**Test:**

```powershell
curl -X POST "$SUPABASE_URL/functions/v1/send-email-notification" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"type":"welcome","to_email":"you@example.com","name":"Test"}'
```

Expected: `{ "success": true, "sent": true }` and a row in `email_queue`.

### `smile-id-create-session`

| Secret | Required |
|--------|----------|
| `SMILE_PARTNER_ID` | Yes |
| `SMILE_API_KEY` | Yes |
| `SMILE_ENVIRONMENT` | `sandbox` or `production` |

Called from Profile → "Verify Identity with Smile ID". Requires a valid user JWT.

### `smile-id-webhook`

| Secret | Required |
|--------|----------|
| `SMILE_API_KEY` | Yes (HMAC verification) |

Callback URL: `https://<project>.supabase.co/functions/v1/smile-id-webhook`

Expects Smile ID payload with `PartnerParams.user_id`, `ResultCode`, and `SmileJobID` (or `ref_id`).

## 4. Auth flows

- [ ] Signup → email confirmation → `/auth/callback` redirects to dashboard
- [ ] Phone OTP on signup (Supabase Auth SMS provider configured)
- [ ] Password reset email uses `send-email-notification` edge function
- [ ] Protected routes redirect unauthenticated users to `/login`
- [ ] `/admin` requires `admin` role in `user_roles`

## 5. Realtime (optional)

Deal room chat uses Supabase Realtime on `deal_room_messages`. Enable replication for that table in the Supabase dashboard if messages don't sync live.

## 6. Known gaps / manual steps

| Item | Action |
|------|--------|
| Resend domain | Verify `noreply@navexmarket.com` in Resend or change `FROM_ADDRESS` in the edge function |
| Smile ID signature | Confirm HMAC header name matches your Smile ID plan |
| Paystack | `paystack-checkout` function exists; wire secrets if billing is live |
| Type regeneration | After migrations: `npm run supabase:gen-types` (requires local Supabase) |

## 7. Security notes

- Never put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in client `.env` files prefixed with `VITE_`
- Email sending goes through the edge function (`src/lib/email.ts`), not the browser
- `.env`, `.env.staging`, and `.env.local` must stay out of git
