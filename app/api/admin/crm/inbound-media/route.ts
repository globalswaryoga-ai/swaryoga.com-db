import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * GET /api/admin/crm/inbound-media
 * Fetch all inbound media files (images, videos, documents)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const kind = searchParams.get('kind'); // 'image', 'video', 'document', 'all'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {
      direction: 'inbound',
      messageType: 'media',
      'media.url': { $exists: true, $ne: null },
    };

    if (kind && kind !== 'all') {
      query['media.kind'] = kind;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await WhatsAppMessage.countDocuments(query);
    const messages = await WhatsAppMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('phoneNumber media createdAt messageContent leadId waMessageId')
      .lean();

    // Group by date for the UI
    const grouped: Record<string, any[]> = {};
    messages.forEach((msg: any) => {
      const dateKey = new Date(msg.createdAt).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({
        _id: msg._id,
        phoneNumber: msg.phoneNumber,
        url: msg.media?.url,
        kind: msg.media?.kind,
        mimeType: msg.media?.mimeType,
        createdAt: msg.createdAt,
        caption: msg.messageContent,
      });
    });

    // Calculate storage stats
    const stats = await WhatsAppMessage.aggregate([
      { $match: { direction: 'inbound', messageType: 'media', 'media.url': { $exists: true, $ne: null } } },
      { $group: { _id: '$media.kind', count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      success: true,
      data: grouped,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce((acc: any, s: any) => ({ ...acc, [s._id]: s.count }), {}),
    });
  } catch (error: any) {
    console.error('[Inbound Media API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm/inbound-media
 * Delete media files from S3 and database
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    const body = await req.json();
    const { messageIds, deleteFromS3 = true } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 });
    }

    const messages = await WhatsAppMessage.find({
      _id: { $in: messageIds },
      direction: 'inbound',
      messageType: 'media',
    }).select('media');

    let deletedFromS3 = 0;
    const bucket = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

    // Delete from S3 if requested
    if (deleteFromS3) {
      for (const msg of messages) {
        if (msg.media?.url) {
          try {
            // Extract S3 key from URL
            const s3Pattern = /https:\/\/[^/]+\.amazonaws\.com\/(.+)/;
            const match = msg.media.url.match(s3Pattern);
            if (match) {
              const key = decodeURIComponent(match[1]);
              await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
              deletedFromS3++;
            }
          } catch (err) {
            console.error('[Delete S3 Error]:', err);
          }
        }
      }
    }

    // Remove media URL from messages (keep the message, just clear media)
    await WhatsAppMessage.updateMany(
      { _id: { $in: messageIds } },
      { $set: { 'media.url': null, 'media.deleted': true, 'media.deletedAt': new Date() } }
    );

    return NextResponse.json({
      success: true,
      deletedCount: messages.length,
      deletedFromS3,
    });
  } catch (error: any) {
    console.error('[Inbound Media Delete Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
