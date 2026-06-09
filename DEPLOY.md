# EdosHatch — Deployment Guide

## Prerequisites

- Node.js 18+
- Supabase project: `gxgcrpemrmqrfoxrbsdf` (edos centre1)
- Vercel account (or any Node.js host)
- M-Pesa Daraja API credentials (Safaricom Developer Portal)
- Africa's Talking account (USSD)
- Twilio account (WhatsApp Business)
- KRA eTIMS credentials (sandbox for testing)

---

## 1. Clone and Install

```bash
cd edospoultry
npm install
```

---

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

Key variables to set:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API (keep secret!) |
| `MPESA_CONSUMER_KEY` | Safaricom Developer Portal → App credentials |
| `MPESA_CONSUMER_SECRET` | Safaricom Developer Portal → App credentials |
| `MPESA_SHORTCODE` | Sandbox: `174379` / Production: your paybill |
| `MPESA_PASSKEY` | Safaricom Developer Portal |
| `MPESA_CALLBACK_URL` | Your deployed URL + `/api/mpesa/callback` |
| `MPESA_ENV` | `sandbox` or `production` |
| `ETIMS_BASE_URL` | `https://etims-api-sandbox.kra.go.ke/etims-api` (sandbox) |
| `ETIMS_PIN` | KRA PIN number |
| `ETIMS_DEVICE_SN` | KRA device serial |
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (sandbox) |
| `AT_API_KEY` | Africa's Talking dashboard |
| `AT_USERNAME` | `sandbox` (testing) or your AT username |
| `AT_USSD_CODE` | Your registered USSD code, e.g. `*384*57463#` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | mapbox.com → Access tokens |
| `CRON_SECRET` | Random string for cron job auth |

---

## 3. Database Setup

Run migrations in order via Supabase CLI or SQL Editor:

```bash
# Option A: Supabase CLI
npx supabase db push

# Option B: Paste into Supabase SQL Editor
# Run files in order:
# 1. supabase/migrations/20240101000001_edoshatch_schema.sql
# 2. supabase/migrations/20240101000002_kenya_geography.sql
# 3. supabase/migrations/20240101000003_rls_policies.sql
# 4. supabase/migrations/20240101000004_views_and_analytics.sql
```

Enable PostGIS extension (required for GPS ward detection):
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Refresh materialized views after seeding data:
```sql
SELECT fn_refresh_all_mvs();
```

---

## 4. First Admin User

1. Go to Supabase Authentication → Users → Add user
2. Create user with your email/password
3. Run this SQL to make them super_admin:

```sql
INSERT INTO profiles (id, organization_id, role, full_name)
VALUES (
  '<user-id-from-auth>',
  '00000000-0000-0000-0000-000000000001',
  'super_admin',
  'Admin User'
);
```

---

## 5. Local Development

```bash
npm run dev
```

Open http://localhost:3000 → redirects to /login

---

## 6. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect GitHub repo to Vercel for auto-deploys.

**Set all environment variables in Vercel dashboard** under Project → Settings → Environment Variables.

---

## 7. USSD Setup (Africa's Talking)

1. Register at africastalking.com
2. Create a new USSD service
3. Set callback URL to: `https://yourdomain.com/api/ussd/webhook`
4. Set your USSD code (e.g. `*384*57463#`)
5. Test with AT Simulator before going live

---

## 8. WhatsApp Setup (Twilio)

1. Create Twilio account at twilio.com
2. Enable WhatsApp Sandbox in Twilio Console
3. Set webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
4. For production: apply for WhatsApp Business API (2-3 weeks approval)

---

## 9. M-Pesa Setup

### Sandbox Testing
- Use shortcode `174379`, passkey from Safaricom
- STK Push test: any phone triggers a prompt
- Test credentials work as-is with `MPESA_ENV=sandbox`

### Production
1. Register at developer.safaricom.co.ke
2. Create production app, get live credentials
3. Register `MPESA_CALLBACK_URL` — must be HTTPS, publicly accessible
4. Set `MPESA_ENV=production`

---

## 10. eTIMS Setup (Kenya KRA)

1. Register at etims.kra.go.ke
2. Get sandbox credentials (PIN, device serial, branch ID)
3. Test invoices appear in KRA sandbox portal
4. For production: requires KRA approval and real PIN

**Cron job for retry queue** — set up a cron to hit:
```
GET https://yourdomain.com/api/etims/generate
Authorization: Bearer <CRON_SECRET>
```
Recommended: every 15 minutes.

On Vercel, add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/etims/generate",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## 11. Testing the Success Criterion

**Farmer in Kitui County, Mutomo subcounty, Kyangwithya ward orders 50 chicks via USSD:**

1. Register the farmer via Dashboard → Farmers → Register
   - Select: County = Kitui, Subcounty = Mutomo, Ward = Kyangwithya East
2. Dial `*384*57463#` from the registered phone
3. Select: 1 (Order Chicks) → enter `50` → select `2` (Layer) → select `1` (Confirm)
4. Order confirmed in < 2 minutes ✓
5. Order appears in Dashboard → Analytics with ward-level breakdown ✓

---

## 12. Refresh Analytics (Materialized Views)

Schedule this to run nightly:
```sql
SELECT fn_refresh_all_mvs();
```

Or via Supabase Edge Functions / pg_cron:
```sql
-- Install pg_cron extension
SELECT cron.schedule('refresh-mvs', '0 1 * * *', 'SELECT fn_refresh_all_mvs()');
```

---

## Architecture Summary

```
Browser/PWA ──→ Next.js App Router (Vercel)
                    ├── /api/mpesa/*      ← M-Pesa Daraja
                    ├── /api/etims/*      ← KRA eTIMS
                    ├── /api/whatsapp/*   ← Twilio WhatsApp
                    └── /api/ussd/*       ← Africa's Talking
                    
Supabase (gxgcrpemrmqrfoxrbsdf)
    ├── PostgreSQL 17 + PostGIS
    ├── Row Level Security (hierarchical)
    ├── Materialized Views (analytics)
    └── Auth (JWT)
    
Offline Support
    └── IndexedDB (idb) → sync on reconnect
```

---

## Support

- EdosHatch docs: `/DEPLOY.md`  
- Supabase project: https://supabase.com/dashboard/project/gxgcrpemrmqrfoxrbsdf  
- Issues: contact Edos Centre team
