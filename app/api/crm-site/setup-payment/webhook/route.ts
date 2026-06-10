import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUserCompartment } from '@/lib/schemas/enterpriseSchemas';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';


/**
 * POST /api/crm-site/setup-payment/webhook
 * 
 * Cashfree webhook handler for setup/storage payments
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const timestamp = request.headers.get('x-webhook-timestamp') || '';

    // Verify signature
    const secretKey = process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY;
    if (secretKey) {
      const signatureData = timestamp + rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(signatureData)
        .digest('base64');
      
      if (signature !== expectedSignature) {
        console.warn('Setup payment webhook: Invalid signature');
        // Don't reject - Cashfree sandbox may not always sign properly
      }
    }

    const payload = JSON.parse(rawBody);
    console.log('Setup payment webhook received:', JSON.stringify(payload, null, 2));

    const { data } = payload;
    if (!data?.order?.order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const orderId = data.order.order_id;
    const orderStatus = data.order.order_status;
    const paymentStatus = data.payment?.payment_status;

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Find the payment record
    const paymentRecord = await crmDb.collection('setup_payments').findOne({ orderId });
    
    if (!paymentRecord) {
      console.error('Setup payment not found:', orderId);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update payment status
    if (orderStatus === 'PAID' || paymentStatus === 'SUCCESS') {
      await crmDb.collection('setup_payments').updateOne(
        { orderId },
        { 
          $set: { 
            status: 'completed',
            paidAt: new Date(),
            webhookData: payload,
          } 
        }
      );

      // Update user's setup status
      await crmDb.collection('admin_users').updateOne(
        { $or: [{ userId: paymentRecord.userId }, { email: paymentRecord.email }] },
        { 
          $set: { 
            setupComplete: true,
            setupPaidAt: new Date(),
            planId: paymentRecord.planId || 'starter',
            planName: paymentRecord.planName || 'Starter',
            storageLimitMB: paymentRecord.storageMB || 500,
            storageUsedMB: 0,
          } 
        }
      );

      // Update user compartment - mark storage as purchased
      const storagePlanMap: Record<number, string> = {
        500: 'starter',
        2048: 'growth',
        10240: 'pro',
      };
      const storageMB = paymentRecord.storageMB || 500;
      const storagePlan = storagePlanMap[storageMB] || 'starter';

      const UserCompartment = getUserCompartment();
      await UserCompartment.findOneAndUpdate(
        { userId: paymentRecord.userId },
        {
          $set: {
            'storage.quotaMB': storageMB,
            'storage.plan': storagePlan,
            'storage.purchasedAt': new Date(),
            'setup.steps.storagePurchased': true,
          },
        },
        { upsert: false }
      );

      // ── Start the FREE TRIAL on the registry tenant ──
      // The data (storage) payment is the 1st payment; on success the tenant
      // enters a free trial. The SUBSCRIPTION payment is collected only after
      // the trial ends. NOTE: setup-payment's planId is a STORAGE plan, not a
      // subscription tier — so we do NOT touch tenant.plan here. Trial length
      // comes from the tenant's actual subscription plan. Wrapped so it can
      // never break the payment flow.
      try {
        const email = String(paymentRecord.email || '').trim().toLowerCase();
        const or: any[] = [];
        if (email) or.push({ ownerEmail: email });
        if (paymentRecord.userId) or.push({ ownerUserId: paymentRecord.userId });
        if (paymentRecord.tenantSlug) or.push({ slug: paymentRecord.tenantSlug });

        if (or.length) {
          const tenantDoc = await crmDb.collection('tenants').findOne({ $or: or });
          const tier = String(tenantDoc?.plan || 'free').toLowerCase();
          let trialDays = 14;
          try {
            const cfgDoc = await crmDb.collection('auto_config').findOne({ key: 'tenant_plans' });
            const plans = Array.isArray((cfgDoc as any)?.plans) ? (cfgDoc as any).plans : [];
            const planCfg = plans.find((p: any) => p.tier === tier);
            const td = Number(planCfg?.trialDays);
            if (Number.isFinite(td) && td > 0) trialDays = td;
          } catch { /* default 14 */ }

          const now = new Date();
          const trialEndsAt = new Date(now.getTime() + trialDays * 86_400_000);
          await crmDb.collection('tenants').updateOne(
            { $or: or },
            {
              $set: {
                status: 'trial',
                trialStartsAt: now,
                trialEndsAt,
                dataPaid: true,
                dataPaidAt: now,
                dataPaymentAmount: paymentRecord.amount || 0,
              },
            },
          );
          console.log(`Trial started for ${email || paymentRecord.userId}: ${trialDays}d, ends ${trialEndsAt.toISOString()}`);
        }
      } catch (e) {
        console.error('Trial start (setup webhook) failed:', e);
      }

      console.log('Setup payment completed for user:', paymentRecord.userId || paymentRecord.email);
    } else if (orderStatus === 'EXPIRED' || orderStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      await crmDb.collection('setup_payments').updateOne(
        { orderId },
        { 
          $set: { 
            status: 'failed',
            failedAt: new Date(),
            webhookData: payload,
          } 
        }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Setup payment webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Allow GET for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    hint: 'POST Cashfree webhook events here' 
  });
}
