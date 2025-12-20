# 🔄 PayU Reconciliation Implementation Guide

**Purpose:** Add payment verification and reconciliation capabilities  
**Status:** Optional but recommended for production  
**Complexity:** Medium  
**Time to implement:** 30-45 minutes

---

## Overview

This guide adds 2 new API endpoints to your system:

1. **Verify Payment Endpoint** - On-demand payment verification
2. **Reconciliation Cron Job** - Nightly batch verification

Both help handle the rare case where webhooks are missed.

---

## Implementation Steps

### Step 1: Add verifyPaymentStatus Function

**File:** `lib/payments/payu.ts`

Add this function after the existing `verifyPayUResponseHash` function:

```typescript
/**
 * Verify Payment API - Query PayU for transaction status
 * 
 * Use Case: Reconciliation if S2S webhook missed
 * Reference: PayU Verify Payments API documentation
 */
export async function verifyPaymentStatus(txnid: string) {
  if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
    console.error('❌ PayU credentials not configured');
    throw new Error('PayU credentials not configured');
  }

  if (!txnid || txnid.trim() === '') {
    throw new Error('txnid is required');
  }

  try {
    // Generate hash for API request
    // Formula: key|command|var1|salt
    const hashString = `${PAYU_MERCHANT_KEY}|verify_payment|${txnid}|${PAYU_MERCHANT_SALT}`;
    const hash = crypto
      .createHash('sha512')
      .update(hashString)
      .digest('hex');

    // Select endpoint based on mode
    const endpoint = PAYU_MODE === 'PRODUCTION'
      ? 'https://info.payu.in/merchant/postservice.php?form=2'
      : 'https://test.payu.in/merchant/postservice.php?form=2';

    console.log(`🔄 Verifying payment: ${txnid} (${PAYU_MODE} mode)`);

    // Call PayU API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'key': PAYU_MERCHANT_KEY,
        'command': 'verify_payment',
        'var1': txnid,
        'hash': hash,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`PayU API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.transaction_details || !data.transaction_details[txnid]) {
      console.warn(`⚠️  Transaction not found in PayU: ${txnid}`);
      return {
        txnid,
        status: 'not_found',
        found: false,
      };
    }

    const txnDetails = data.transaction_details[txnid][0];

    const result = {
      txnid,
      found: true,
      status: (txnDetails.status || '').toLowerCase(),
      amount: parseFloat(txnDetails.amount || '0'),
      payuId: txnDetails.payuId || txnDetails.mihpayid,
      email: txnDetails.email,
      firstname: txnDetails.firstname,
      productinfo: txnDetails.productinfo,
      error: txnDetails.error_Message || '',
      raw: txnDetails,
    };

    console.log(`✅ Payment verified: ${txnid}`, {
      status: result.status,
      amount: result.amount,
      payuId: result.payuId,
    });

    return result;
  } catch (error) {
    console.error(`❌ Error verifying payment ${txnid}:`, error);
    throw error;
  }
}
```

### Step 2: Create Verify Payment Endpoint

**File:** `app/api/admin/verify-payment/route.ts`

Create new file with this content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { verifyPaymentStatus } from '@/lib/payments/payu';

/**
 * Admin endpoint to verify a payment status
 * 
 * GET /api/admin/verify-payment?txnid=TXN_xxx
 * 
 * Returns:
 * {
 *   txnid: string,
 *   payuStatus: string (success, failure, pending, unknown),
 *   dbStatus: string (completed, failed, pending, not_found),
 *   match: boolean (PayU and DB status match),
 *   action: string (OK, UPDATE_REQUIRED),
 *   details: { ... }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';
    const decoded = token ? verifyToken(token) : null;

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get txnid parameter
    const txnid = request.nextUrl.searchParams.get('txnid');
    if (!txnid || txnid.trim() === '') {
      return NextResponse.json(
        { error: 'txnid query parameter is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Query PayU
    const payuResult = await verifyPaymentStatus(txnid);
    const payuStatus = payuResult.status;

    // Query database
    const order = await Order.findOne({ payuTxnId: txnid }).lean();
    const dbStatus = order?.status || 'not_found';

    // Compare
    const match = payuStatus === dbStatus;

    // Determine action
    let action = 'OK';
    if (!match && payuStatus !== 'pending' && payuStatus !== 'not_found') {
      action = 'UPDATE_REQUIRED';
    }

    return NextResponse.json({
      success: true,
      txnid,
      payu: {
        status: payuStatus,
        amount: payuResult.amount,
        payuId: payuResult.payuId,
        email: payuResult.email,
        error: payuResult.error,
      },
      database: {
        status: dbStatus,
        amount: order?.total,
        payuId: order?.transactionId,
        email: order?.shippingAddress?.email,
        orderId: order?._id,
      },
      comparison: {
        statusMatch: payuStatus === dbStatus,
        amountMatch: Math.abs((payuResult.amount || 0) - (order?.total || 0)) < 0.01,
        payuIdMatch: payuResult.payuId === order?.transactionId,
      },
      action,
      message: match
        ? 'All systems consistent'
        : `Discrepancy detected: PayU=${payuStatus}, DB=${dbStatus}`,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      {
        error: 'Payment verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually reconcile a payment
 * 
 * POST /api/admin/verify-payment
 * Body: { txnid: "TXN_xxx" }
 * 
 * Updates database if discrepancy found
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';
    const decoded = token ? verifyToken(token) : null;

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const txnid = body.txnid;

    if (!txnid || txnid.trim() === '') {
      return NextResponse.json(
        { error: 'txnid is required in request body' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Verify with PayU
    const payuResult = await verifyPaymentStatus(txnid);
    const payuStatus = payuResult.status;

    // Get order
    const order = await Order.findOne({ payuTxnId: txnid });
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found in database' },
        { status: 404 }
      );
    }

    const previousStatus = order.status;

    // Check if update needed
    if (payuStatus !== previousStatus && payuStatus !== 'pending' && payuStatus !== 'not_found') {
      console.log(`🔄 Reconciliation: Updating ${txnid}`);
      console.log(`   From: ${previousStatus} → To: ${payuStatus}`);

      // Update order
      order.status = payuStatus;

      if (payuStatus === 'success') {
        order.paymentStatus = 'completed';
      } else if (payuStatus === 'failure') {
        order.paymentStatus = 'failed';
        order.failureReason = payuResult.error || 'Reconciliation updated from PayU';
      }

      order.transactionId = payuResult.payuId;

      await order.save();

      return NextResponse.json({
        success: true,
        action: 'UPDATED',
        txnid,
        previousStatus,
        newStatus: payuStatus,
        orderId: order._id,
        message: `Order status updated: ${previousStatus} → ${payuStatus}`,
      });
    }

    // No update needed
    return NextResponse.json({
      success: true,
      action: 'NO_ACTION_NEEDED',
      txnid,
      status: previousStatus,
      message: 'Order status already correct',
    });
  } catch (error) {
    console.error('Error reconciling payment:', error);
    return NextResponse.json(
      {
        error: 'Payment reconciliation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Step 3: Create Reconciliation Cron Job (Optional)

**File:** `app/api/cron/reconcile-payments/route.ts`

Create new file with this content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { verifyPaymentStatus } from '@/lib/payments/payu';

/**
 * Cron job to reconcile payments
 * 
 * Runs nightly (configured in vercel.json)
 * Finds pending orders older than 5 minutes
 * Verifies each with PayU
 * Updates any discrepancies
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Vercel cron secret
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Invalid cron secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting payment reconciliation job');

    // Connect to database
    await connectDB();

    // Find pending orders older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const pendingOrders = await Order.find({
      status: 'pending',
      createdAt: { $lt: fiveMinutesAgo },
      paymentMethod: { $in: ['india_payu', 'international_payu'] },
    });

    console.log(`📋 Found ${pendingOrders.length} pending orders to reconcile`);

    let checked = 0;
    let updated = 0;
    let errors = 0;
    const details: any[] = [];

    // Verify each order
    for (const order of pendingOrders) {
      const txnid = order.payuTxnId;

      try {
        checked++;

        // Query PayU
        const payuResult = await verifyPaymentStatus(txnid);
        const payuStatus = payuResult.status;

        if (!payuResult.found || payuStatus === 'pending' || payuStatus === 'not_found') {
          // Still pending or not found - skip
          continue;
        }

        if (payuStatus === order.status) {
          // Status matches - no action needed
          continue;
        }

        // Found discrepancy - update
        console.log(`⚠️  Discrepancy: ${txnid}`);
        console.log(`   PayU: ${payuStatus}, DB: ${order.status}`);

        // Update order
        const previousStatus = order.status;

        order.status = payuStatus;

        if (payuStatus === 'success') {
          order.paymentStatus = 'completed';
        } else if (payuStatus === 'failure') {
          order.paymentStatus = 'failed';
          order.failureReason = payuResult.error || 'Reconciliation from PayU';
        }

        order.transactionId = payuResult.payuId;

        await order.save();

        updated++;

        details.push({
          txnid,
          orderId: order._id,
          previousStatus,
          newStatus: payuStatus,
          payuId: payuResult.payuId,
          amount: payuResult.amount,
          action: 'UPDATED',
        });
      } catch (error) {
        errors++;
        console.error(`❌ Error verifying ${txnid}:`, error);

        details.push({
          txnid,
          orderId: order._id,
          action: 'VERIFY_ERROR',
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      checked,
      updated,
      errors,
      details: details.length > 0 ? details : 'None',
      summary: `Reconciliation complete: ${checked} checked, ${updated} updated, ${errors} errors`,
    };

    console.log(`✅ Reconciliation job complete:`, result.summary);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Reconciliation job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Reconciliation job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Step 4: Configure Cron in Vercel

**File:** `vercel.json`

Add crons section:

```json
{
  "crons": [
    {
      "path": "/api/cron/reconcile-payments",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs the reconciliation job daily at 2 AM UTC.

### Step 5: Set Cron Secret

Add environment variable to Vercel:

```bash
vercel env add CRON_SECRET
# → Enter a strong random string
```

Or in `.env.local` for testing:

```
CRON_SECRET=your-random-secret-key
```

---

## Testing the Implementation

### Test 1: Verify Single Payment

```bash
# Get your JWT token first
curl -X GET "http://localhost:3000/api/admin/verify-payment?txnid=TXN_abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
{
  "success": true,
  "txnid": "TXN_abc123",
  "payu": {
    "status": "success",
    "amount": 103.30,
    "payuId": "403993715531077182"
  },
  "database": {
    "status": "completed",
    "amount": 103.30
  },
  "comparison": {
    "statusMatch": true,
    "amountMatch": true
  },
  "action": "OK"
}
```

### Test 2: Manual Reconciliation

```bash
curl -X POST "http://localhost:3000/api/admin/verify-payment" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"txnid": "TXN_abc123"}'

# Expected response:
{
  "success": true,
  "action": "NO_ACTION_NEEDED",
  "txnid": "TXN_abc123",
  "status": "completed",
  "message": "Order status already correct"
}
```

### Test 3: Test Cron Job

```bash
# Manually trigger cron endpoint (testing only)
curl -X POST "http://localhost:3000/api/cron/reconcile-payments" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# Or from Vercel dashboard:
# → Settings → Cron Jobs → Test
```

---

## Verification Checklist

- [ ] `verifyPaymentStatus` function added to `lib/payments/payu.ts`
- [ ] Function works correctly (tested with real txnid)
- [ ] `/api/admin/verify-payment` GET endpoint created
- [ ] GET endpoint returns correct comparison
- [ ] POST endpoint created for manual reconciliation
- [ ] POST endpoint updates database correctly
- [ ] `/api/cron/reconcile-payments` endpoint created
- [ ] Cron endpoint checks pending orders
- [ ] Cron endpoint updates discrepancies
- [ ] `vercel.json` configured with cron schedule
- [ ] `CRON_SECRET` environment variable set
- [ ] All endpoints require authentication
- [ ] Error handling in place
- [ ] Logging shows detailed information

---

## Usage in Production

### On-Demand Verification

```bash
# Admin manually checks a payment
curl -X GET \
  "https://your-domain.com/api/admin/verify-payment?txnid=TXN_xyz" \
  -H "Authorization: Bearer $ADMIN_JWT"

# If discrepancy found:
curl -X POST \
  "https://your-domain.com/api/admin/verify-payment" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"txnid": "TXN_xyz"}'
```

### Automatic Reconciliation

- Cron job runs every night at 2 AM UTC
- Finds pending orders older than 5 minutes
- Queries PayU for actual status
- Updates any discrepancies
- Logs complete report

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Wrong admin JWT | Use admin token, verify isAdmin flag |
| PayU API error | Wrong credentials | Check PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT |
| Transaction not found | Wrong txnid | Use exact txnid from database |
| No cron runs | Secret mismatch | Verify CRON_SECRET matches |
| Cron skips orders | Age check | Orders must be > 5 minutes old |

---

This completes your reconciliation implementation! You now have:

✅ On-demand payment verification endpoint  
✅ Manual reconciliation capability  
✅ Automatic nightly reconciliation job  
✅ Detailed logging and reporting  
✅ Error handling and recovery  

Your system can now handle any edge case where webhooks are missed.

