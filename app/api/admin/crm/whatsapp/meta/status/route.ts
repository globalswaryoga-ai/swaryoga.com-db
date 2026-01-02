import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccessToken = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_BUSINESS_TOKEN
    );

    const hasPhoneNumberId = Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_PHONE_NUMBER
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          hasAccessToken,
          hasPhoneNumberId,
          message:
            hasAccessToken && hasPhoneNumberId
              ? '✅ Meta WhatsApp env looks good.'
              : 'Set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID (preferred) on the server.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read env status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
