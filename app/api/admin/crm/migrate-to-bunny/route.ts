import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { upsertBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (max allowed by Vercel for pro, but standard limit applies based on plan)

/**
 * GET /api/admin/crm/migrate-to-bunny
 * Migrates old MongoDB WhatsAppMessages to BunnyDB in batches
 * Query Params:
 * - limit: number of messages to process in this batch (default 100)
 * - skip: number of messages to skip (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const skip = parseInt(url.searchParams.get('skip') || '0', 10);

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    // Find messages in MongoDB
    const messages = await WhatsAppMessage.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No messages found to migrate in this batch.',
        processed: 0,
        nextSkip: skip,
        done: true
      });
    }

    let processed = 0;
    let errors = 0;
    const errorDetails = [];

    // Process sequentially to not overload BunnyDB HTTP API
    for (const doc of messages) {
      try {
        const messageData = doc as any;
        
        // Ensure IDs are strings
        messageData._id = messageData._id.toString();
        if (messageData.leadId) {
          messageData.leadId = messageData.leadId.toString();
        }

        await upsertBunnyMetaMessage(messageData);
        processed++;
      } catch (err: any) {
        console.error(`Error migrating message ${doc._id}:`, err);
        errors++;
        errorDetails.push({ id: doc._id, error: err?.message || 'Unknown error' });
      }
    }

    const totalCount = await WhatsAppMessage.countDocuments();

    return NextResponse.json({
      success: true,
      message: `Migrated ${processed} messages.`,
      processed,
      errors,
      errorDetails,
      skip,
      limit,
      nextSkip: skip + limit,
      totalCount,
      progressPercentage: Math.round(((skip + processed) / totalCount) * 100),
      done: (skip + processed) >= totalCount
    });

  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
