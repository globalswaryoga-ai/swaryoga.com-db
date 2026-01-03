import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/crm/whatsapp/meta/status
 * Check Meta WhatsApp API connection status
 * Returns: { status: 'connected'|'error', message: string, meta?: object }
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    
    // Basic token validation
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Meta API credentials not configured',
          meta: {
            accessTokenSet: !!accessToken,
            phoneNumberIdSet: !!phoneNumberId,
          },
        },
        { status: 200 }
      );
    }

    // Test connection to Meta API
    try {
      const response = await fetch(
        `https://graph.instagram.com/v18.0/${phoneNumberId}?fields=id,phone_number_id,display_phone_number,quality_rating&access_token=${accessToken}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          {
            status: 'error',
            message: data?.error?.message || 'Failed to connect to Meta API',
            meta: data?.error || null,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          status: 'connected',
          message: 'Meta WhatsApp API is connected',
          meta: {
            phoneNumberId: data.id,
            displayPhoneNumber: data.display_phone_number,
            qualityRating: data.quality_rating,
          },
        },
        { status: 200 }
      );
    } catch (fetchError) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Network error: ${String(fetchError)}`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: String(error),
      },
      { status: 500 }
    );
  }
}
