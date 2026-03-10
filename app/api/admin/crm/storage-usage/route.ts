import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// Format bytes to human readable
function formatBytes(bytes: number): { value: number; unit: string; display: string } {
  if (bytes === 0) return { value: 0, unit: 'B', display: '0 B' };
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  
  return {
    value,
    unit: sizes[i],
    display: `${value} ${sizes[i]}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    const db = mongoose.connection.useDb(crmDbName).db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }

    const ownerId = getViewerUserId(decoded);
    const isSuper = isSuperAdmin(decoded);

    // Tenant-scoped collections that store user data
    const tenantCollections = [
      'crm_leads',
      'crm_whatsapp_messages',
      'crm_whatsapp_templates',
      'crm_broadcast_runs',
      'crm_chatbot_flows',
      'crm_email_campaigns',
      'crm_auto_configs',
      'crm_sales_reports',
      'crm_community_posts',
      'crm_landing_pages',
    ];

    // For super admin: show full DB stats. For regular users: estimate from their docs.
    let totalDataSize = 0;
    let totalDocCount = 0;
    const topCollections: { name: string; size: { value: number; unit: string; display: string }; count: number }[] = [];

    if (isSuper) {
      // Super admin sees whole database
      const stats = await db.stats();
      totalDataSize = stats.storageSize || stats.dataSize || 0;
      totalDocCount = stats.objects || 0;

      const collections = await db.listCollections().toArray();
      const colStats = await Promise.all(
        collections.map(async (col) => {
          try {
            const cs = await db.command({ collStats: col.name });
            return { name: col.name, size: cs.size || 0, count: cs.count || 0 };
          } catch { return { name: col.name, size: 0, count: 0 }; }
        })
      );
      colStats.sort((a, b) => b.size - a.size);
      topCollections.push(
        ...colStats.slice(0, 5).map(c => ({ name: c.name, size: formatBytes(c.size), count: c.count }))
      );
    } else {
      // Regular user: count only their own documents per collection
      const results = await Promise.all(
        tenantCollections.map(async (colName) => {
          try {
            const col = db.collection(colName);
            const count = await col.countDocuments({ ownerId });
            // Estimate avg doc size from a small sample
            let avgSize = 500; // default estimate 500 bytes
            if (count > 0) {
              const sample = await col.find({ ownerId }).limit(5).toArray();
              if (sample.length > 0) {
                const totalSampleSize = sample.reduce((sum, doc) => sum + JSON.stringify(doc).length, 0);
                avgSize = totalSampleSize / sample.length;
              }
            }
            const estimatedSize = count * avgSize;
            return { name: colName, count, size: estimatedSize };
          } catch {
            return { name: colName, count: 0, size: 0 };
          }
        })
      );

      results.sort((a, b) => b.size - a.size);
      for (const r of results) {
        totalDataSize += r.size;
        totalDocCount += r.count;
      }
      topCollections.push(
        ...results.filter(r => r.count > 0).slice(0, 5).map(r => ({
          name: r.name.replace('crm_', ''),
          size: formatBytes(r.size),
          count: r.count,
        }))
      );
    }

    // Cost calculation (₹35 per GB per month, ~$0.42/GB, minimum ₹30/mo for free users)
    const totalGB = totalDataSize / (1024 * 1024 * 1024);
    const rawCostINR = Math.ceil(totalGB * 35);
    const monthlyCost = Math.max(30, rawCostINR); // Minimum ₹30/month for storage
    const monthlyCostUSD = Math.max(0.36, Math.ceil(totalGB * 0.42 * 100) / 100);

    // Billing cycle: calculate days remaining in current 30-day billing cycle
    // Based on user creation date or current month cycle
    let billingCycleDaysRemaining = 0;
    let billingCycleEndDate: string | null = null;
    let storagePlan: string = 'free';

    if (!isSuper) {
      try {
        // Get user creation date for billing cycle calculation
        const adminUser = await db.collection('admin_users').findOne(
          { $or: [{ userId: ownerId }, { email: decoded.email }] },
          { projection: { createdAt: 1, storagePaidUntil: 1, planId: 1 } }
        );
        
        storagePlan = adminUser?.planId || 'free';
        const now = new Date();
        
        if (adminUser?.storagePaidUntil) {
          // If there's a specific paid-until date, use that
          const paidUntil = new Date(adminUser.storagePaidUntil);
          billingCycleDaysRemaining = Math.max(0, Math.ceil((paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          billingCycleEndDate = paidUntil.toISOString();
        } else {
          // Calculate based on monthly cycle from account creation
          const createdAt = adminUser?.createdAt ? new Date(adminUser.createdAt) : now;
          const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          const currentCycleDay = daysSinceCreation % 30;
          billingCycleDaysRemaining = Math.max(0, Math.ceil(30 - currentCycleDay));
          const cycleEnd = new Date(now.getTime() + billingCycleDaysRemaining * 24 * 60 * 60 * 1000);
          billingCycleEndDate = cycleEnd.toISOString();
        }
      } catch {
        billingCycleDaysRemaining = 30;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        // Total sizes
        dataSize: formatBytes(totalDataSize),
        storageSize: formatBytes(totalDataSize),
        indexSize: formatBytes(0),
        totalSize: formatBytes(totalDataSize),
        
        // Raw bytes (super admin only)
        ...(isSuper ? {
          dataSizeBytes: totalDataSize,
          storageSizeBytes: totalDataSize,
          indexSizeBytes: 0,
          totalSizeBytes: totalDataSize,
        } : {}),
        
        // GB value for cost
        totalGB: parseFloat(totalGB.toFixed(3)),
        
        // Cost
        monthlyCost,
        monthlyCostUSD,
        ...(isSuper ? { costPerGB: 35, costPerGBUSD: 0.42 } : {}),
        
        // Collections (details super admin only)
        collectionCount: topCollections.length,
        ...(isSuper ? { topCollections, documentCount: totalDocCount } : {}),
        
        // Database info (name hidden for non-super-admins)
        ...(isSuper ? { dbName: crmDbName } : {}),
        scope: isSuper ? 'global' : 'user',
        
        // Billing cycle info (for free/regular users)
        billingCycleDaysRemaining,
        billingCycleEndDate,
        storagePlan,
        minimumMonthlyINR: 30,
        isSuperAdmin: isSuper,
      },
    });
  } catch (error) {
    console.error('[Storage Usage API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get storage usage' },
      { status: 500 }
    );
  }
}
