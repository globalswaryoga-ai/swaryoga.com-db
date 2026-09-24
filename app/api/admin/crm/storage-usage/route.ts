import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
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
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    let totalDataSize = 0;
    let totalDocCount = 0;
    const topCollections: { name: string; size: { value: number; unit: string; display: string }; count: number }[] = [];

    if (isSuper) {
      // Super admin sees whole database stats directly from Bunny DB
      const sql = `
        SELECT collection_name as name, 
               count(document_id) as count, 
               sum(length(document_json)) as size 
        FROM mongo_documents 
        GROUP BY collection_name
        ORDER BY size DESC
      `;
      const result = await bunnyExecute(sql);
      
      for (const row of result.rows) {
        const size = Number(row.size || 0);
        const count = Number(row.count || 0);
        totalDataSize += size;
        totalDocCount += count;
        if (topCollections.length < 5) {
          topCollections.push({ name: String(row.name), size: formatBytes(size), count });
        }
      }
    } else {
      // Regular user: count only their own documents per collection using Bunny DB json_extract
      for (const colName of tenantCollections) {
        const sql = `
          SELECT count(document_id) as count, sum(length(document_json)) as size 
          FROM mongo_documents 
          WHERE collection_name = ?
            AND json_extract(document_json, '$.ownerId') = ?
        `;
        const result = await bunnyExecute({
          sql,
          args: [colName, ownerId]
        });
        
        const count = Number(result.rows[0]?.count || 0);
        const size = Number(result.rows[0]?.size || 0);
        
        if (count > 0) {
          totalDataSize += size;
          totalDocCount += count;
          topCollections.push({
            name: colName.replace('crm_', ''),
            size: formatBytes(size),
            count,
          });
        }
      }
      topCollections.sort((a, b) => b.size.value - a.size.value);
      if (topCollections.length > 5) topCollections.length = 5;
    }

    // Cost calculation (₹35 per GB per month, ~$0.42/GB, minimum ₹30/mo for free users)
    const totalGB = totalDataSize / (1024 * 1024 * 1024);
    const rawCostINR = Math.ceil(totalGB * 35);
    const monthlyCost = Math.max(30, rawCostINR); // Minimum ₹30/month for storage
    const monthlyCostUSD = Math.max(0.36, Math.ceil(totalGB * 0.42 * 100) / 100);

    // Billing cycle: calculate days remaining in current 30-day billing cycle
    let billingCycleDaysRemaining = 0;
    let billingCycleEndDate: string | null = null;
    let storagePlan: string = 'free';

    if (!isSuper) {
      try {
        // Get user creation date for billing cycle calculation from Bunny DB
        const sql = `
          SELECT document_json
          FROM mongo_documents 
          WHERE collection_name = 'admin_users' 
            AND (json_extract(document_json, '$.userId') = ? OR json_extract(document_json, '$.email') = ?)
          LIMIT 1
        `;
        const result = await bunnyExecute({
          sql,
          args: [ownerId, decoded.email]
        });
        
        if (result.rows.length > 0) {
          const adminUser = JSON.parse(String(result.rows[0].document_json));
          storagePlan = adminUser?.planId || 'free';
          const now = new Date();
          
          if (adminUser?.storagePaidUntil) {
            const paidUntil = new Date(adminUser.storagePaidUntil);
            billingCycleDaysRemaining = Math.max(0, Math.ceil((paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            billingCycleEndDate = paidUntil.toISOString();
          } else {
            const createdAt = adminUser?.createdAt ? new Date(adminUser.createdAt) : now;
            const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            const currentCycleDay = daysSinceCreation % 30;
            billingCycleDaysRemaining = Math.max(0, Math.ceil(30 - currentCycleDay));
            const cycleEnd = new Date(now.getTime() + billingCycleDaysRemaining * 24 * 60 * 60 * 1000);
            billingCycleEndDate = cycleEnd.toISOString();
          }
        } else {
          billingCycleDaysRemaining = 30;
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
        
        // Database info
        ...(isSuper ? { dbName: 'BunnyDB (LibSQL)' } : {}),
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
