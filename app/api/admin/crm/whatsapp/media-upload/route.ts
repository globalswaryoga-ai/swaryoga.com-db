import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';

/**
 * POST /api/admin/crm/whatsapp/media-upload
 * 
 * Uploads media file to S3 via WhatsApp Bridge
 * 
 * @param req FormData with file
 * @returns { success: true, url: string, key: string, size: number, mimetype: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Get auth from headers
    const bridgeSecret = req.headers.get('X-Bridge-Secret') || BRIDGE_SECRET;
    const chatId = req.headers.get('X-Chat-Id');

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`[media-upload] Uploading ${file.name} (${file.size} bytes) to S3`);

    // Create new FormData to send to bridge
    const bridgeFormData = new FormData();
    bridgeFormData.append('file', file);

    // Upload to bridge (which uploads to S3)
    const uploadUrl = new URL('/media/upload', BRIDGE_URL);
    const uploadRes = await fetch(uploadUrl.toString(), {
      method: 'POST',
      headers: {
        'x-bridge-secret': bridgeSecret
      },
      body: bridgeFormData
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.json();
      console.error('[media-upload] Bridge error:', error);
      return NextResponse.json(
        { 
          error: error.error || 'Failed to upload to S3',
          details: error.details || {}
        },
        { status: uploadRes.status }
      );
    }

    const data = await uploadRes.json();

    console.log('[media-upload] Success:', {
      url: data.url,
      size: data.size,
      mimetype: data.mimetype,
      chatId
    });

    // Also save to MongoDB for persistence
    try {
      if (chatId) {
        await fetch(new URL('/db/sync/message', BRIDGE_URL).toString(), {
          method: 'POST',
          headers: {
            'x-bridge-secret': bridgeSecret,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messageId: `media-${Date.now()}`,
            chatId,
            body: `📎 ${file.name}`,
            fromMe: true,
            sender: 'Me',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'media',
            hasMedia: true,
            mediaUrl: data.url,
            mediaKey: data.key,
            ack: 2 // Delivered
          })
        });
      }
    } catch (err) {
      console.warn('[media-upload] Failed to sync to MongoDB:', err);
      // Don't fail the request, just log the warning
    }

    return NextResponse.json({
      success: true,
      url: data.url,
      key: data.key,
      size: data.size,
      mimetype: data.mimetype
    });

  } catch (error) {
    console.error('[media-upload] Exception:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload media'
      },
      { status: 500 }
    );
  }
}
