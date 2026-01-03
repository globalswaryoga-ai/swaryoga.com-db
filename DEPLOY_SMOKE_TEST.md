# Deploy Smoke Test (Vercel / Production)

This repo includes a tiny, repeatable smoke test script: `scripts/smoke-prod.js`.

Use it right after a deploy (or any time you suspect an outage) to quickly verify:
- server is reachable
- `/api/health` is OK
- admin auth works
- protected CRM routes work (JWT)

## 1) Health check only (fast)

```bash
BASE_URL='https://your-domain.com' node scripts/smoke-prod.js --health-only
```

Expected:
- exit code `0`
- prints `✅ /api/health: 200`

## 2) Full CRM check (admin login + protected route)

```bash
BASE_URL='https://your-domain.com' \
ADMIN_USER_ID='admincrm' \
ADMIN_PASSWORD='admin12345' \
node scripts/smoke-prod.js
```

Expected:
- `✅ Admin login ok: 200`
- `✅ /api/admin/crm/leads ok: 200`

## 3) Common failures and what to do

### A) `/api/health` fails

- Double-check `BASE_URL` (must include `https://`)
- Confirm the deploy finished in Vercel
- If you see `5xx`, check Vercel function logs for the failing route

### B) Admin login fails (401)

- Wrong `ADMIN_USER_ID` or `ADMIN_PASSWORD`
- Admin user exists but `isAdmin` is false
- MongoDB connection problem (Atlas TLS/network) – the app has a retry-once strategy, but very unstable networks can still fail

### C) Protected route fails (401/403)

- Token missing/expired
- You are hitting the wrong environment (stale deploy / different domain)

### D) Protected route fails (500)

- Usually DB connection or a runtime error in the API route
- Check Vercel logs for `/api/admin/crm/leads`

## Notes

- The script never prints the full password; it redacts it.
- You can add more endpoints to this script over time (orders, WhatsApp Meta status, etc.), but keep it fast.
