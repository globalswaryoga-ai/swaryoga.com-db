# PayU Pending Orders Cleanup (Admin)

When users start PayU checkout multiple times (or close the PayU page before completion), the system creates `Order` documents that stay:

- `status: "pending"`
- `paymentStatus: "pending"`

These orders remain pending until PayU calls the callback endpoint.

## Why you should NOT delete pending orders

Deleting pending orders is unsafe because PayU can still send a **late callback** using the same `txnid`.

If the order is deleted, the callback will not find it and the payment may not be recorded correctly.

## Safe approach: expire stale pending orders (mark as failed)

A safe cleanup method is to **expire** old pending orders by marking them as failed.

This does **not** delete the record.

### How to run (Admin UI)

1. Open: `https://swaryoga.com/admin/dashboard`
2. In the **Maintenance: Expire Stale Pending Orders** card:
   - Email: `swarsakshi9999@gmail.com` (or any user)
   - Older than (minutes): `60` (recommended) — minimum allowed: `30`
   - Payment method: optional (`india_payu` / `international_payu`)
3. Click **Preview** (see how many will be affected)
4. Click **Expire Pending Orders**

Result:

- `status` becomes `failed`
- `paymentStatus` becomes `failed`
- `failureReason` becomes `Expired: no payment confirmation received`

## Optional: permanently delete failed orders

After expiring (and only when you are sure no payment will arrive later), you can delete failed orders:

1. In **Maintenance: Purge Failed Orders**
2. Enter the same email
3. Click **Preview**
4. Click **Delete Failed Orders**

This permanently removes documents with `paymentStatus="failed"`.

## API endpoints (for reference)

- Preview expire pending: `GET /api/admin/orders/expire-pending?email=...&olderThanMinutes=60`
- Execute expire pending: `POST /api/admin/orders/expire-pending`
  - body: `{ "confirm": "EXPIRE_PENDING_ORDERS", "email": "...", "olderThanMinutes": 60 }`

- Preview purge failed: `GET /api/admin/orders/purge-failed?email=...`
- Execute purge failed: `POST /api/admin/orders/purge-failed`
  - body: `{ "confirm": "DELETE_FAILED_ORDERS", "email": "..." }`
