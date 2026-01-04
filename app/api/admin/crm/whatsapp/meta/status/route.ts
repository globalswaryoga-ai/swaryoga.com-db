import { NextRequest, NextResponse } from 'next/server';

function isMetaDisabled(): boolean {
  return [
    process.env.WHATSAPP_DISABLE_META_UI,
    process.env.WHATSAPP_DISABLE_META_SEND,
    process.env.WHATSAPP_DISABLE_CLOUD_SEND,
    process.env.WHATSAPP_FORCE_WEB_BRIDGE,
    process.env.WHATSAPP_DISABLE_CLOUD,
  ].some((v) => String(v || '').toLowerCase() === 'true');
}

/**
 * GET /api/admin/crm/whatsapp/meta/status
 * Check Meta WhatsApp API connection status
 * Returns standard response format with success and data fields
 */
export async function GET(request: NextRequest) {
  try {
    if (isMetaDisabled()) {
      return NextResponse.json(
        { error: 'Meta WhatsApp is disabled on this server' },
        { status: 403 }
      );
    }

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
          success: true,
          data: {
            status: 'error',
            connected: false,
            message: 'Meta API credentials not configured',
            credentialsSet: {
              accessTokenSet: !!accessToken,
              phoneNumberIdSet: !!phoneNumberId,
            },
          },
        },
        { status: 200 }
      );
    }

    // Test connection to Meta API
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=id,display_phone_number,quality_rating&access_token=${accessToken}`,
        { method: 'GET' }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return NextResponse.json(
          {
            success: true,
            data: {
              status: 'error',
              connected: false,
              message: data?.error?.message || 'Failed to connect to Meta API',
              error: data?.error || null,
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'connected',
            connected: true,
            message: 'Meta WhatsApp API is connected',
            phoneNumber: {
              id: data.id,
              displayPhone: data?.display_phone_number,
              qualityRating: data?.quality_rating,
            },
          },
        },
        { status: 200 }
      );
    } catch (fetchError) {
      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'error',
            connected: false,
            message: `Network error: ${String(fetchError)}`,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}
