import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Generate unique session ID
    const sessionId = `wa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    // Connect to WhatsApp Web QR server to get the current QR
    try {
      const base = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').replace(/\/+$/, '');
      if (!base) {
        return NextResponse.json(
          {
            error:
              'WhatsApp bridge is not configured. Set WHATSAPP_BRIDGE_HTTP_URL to the public bridge base URL (e.g. https://wa-bridge.swaryoga.com).',
          },
          { status: 400 }
        );
      }
      const qrResponse = await fetch(`${base}/api/status`);
      const qrStatus = await qrResponse.json();

      if (qrStatus.hasQR) {
        // Get the QR image from WebSocket (this is a workaround - in production you'd want a proper REST endpoint)
        // For now, return instruction to use the whatsapp page with QR modal
        return NextResponse.json({
          success: true,
          data: {
            sessionId,
            qrUrl: null,
            useLiveQr: true,
            instructions: 'The QR code will be displayed in real-time below. Please wait...',
            expiresIn: 900,
            displayText: 'Scan this QR code with your WhatsApp number to authenticate',
          },
        }, { status: 200 });
      } else {
        // QR server not ready, provide guide to user
        return NextResponse.json({
          success: true,
          data: {
            sessionId,
            qrUrl: null,
            useLiveQr: true,
            status: 'waiting_for_qr',
            message: 'WhatsApp Web is initializing. Please wait a moment and refresh the page.',
            expiresIn: 900,
          },
        }, { status: 200 });
      }
    } catch (wsErr) {
      console.error('[QR-Login] WebSocket connection error:', wsErr);
      
      // Fallback: Provide the WhatsApp Web setup guide
      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          qrUrl: null,
          useLiveQr: true,
          message: 'Connecting to WhatsApp Web... This may take 10-30 seconds on first load.',
          expiresIn: 900,
          instructions: [
            'Please wait for the WhatsApp Web QR code to load...',
            'The system is initializing the WhatsApp Web browser connection.',
            'Once ready, a QR code will appear on your screen.',
          ],
        },
      }, { status: 200 });
    }
  } catch (err) {
    console.error('[QR-Login] Generate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate QR' },
      { status: 500 }
    );
  }
}
