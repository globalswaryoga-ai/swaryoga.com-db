import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getServiceConnection } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/connections
 * Fetch current service connections for the logged-in user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ServiceConnection = getServiceConnection();

    const ownerId = getViewerUserId(decoded);
    const connection = await ServiceConnection.findOne({ ownerId }).lean();

    return NextResponse.json({
      success: true,
      connection: connection || null,
    });
  } catch (error) {
    console.error('[Connections API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/connections
 * Save service connections (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    await connectDB();
    const ServiceConnection = getServiceConnection();

    const ownerId = getViewerUserId(decoded);

    const updatedConnection = await ServiceConnection.findOneAndUpdate(
      { ownerId },
      { $set: { ...body, ownerId } },
      { upsert: true, new: true }
    );

    console.log('[Connections API] Saved for ownerId:', ownerId);

    return NextResponse.json({
      success: true,
      message: 'Connections saved successfully',
      connection: updatedConnection,
    });
  } catch (error) {
    console.error('[Connections API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save connections' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/crm/connections
 * Test a specific service connection
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service } = await request.json();

    await connectDB();
    const ServiceConnection = getServiceConnection();
    const ownerId = getViewerUserId(decoded);
    const conn = await ServiceConnection.findOne({ ownerId }).lean() as Record<string, any> | null;

    if (!conn) {
      return NextResponse.json({ success: false, error: 'No connections configured. Save your settings first.' }, { status: 400 });
    }

    let testResult: { connected: boolean; error: string } = { connected: false, error: '' };

    switch (service) {
      case 'email': {
        const email = conn.email;
        if (!email?.smtpHost || !email?.smtpUser) {
          testResult = { connected: false, error: 'SMTP host and username are required. Please fill in all SMTP fields.' };
        } else {
          // For now, mark as connected if fields are present — real SMTP test can be added later
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'metaWhatsApp': {
        const meta = conn.metaWhatsApp;
        if (!meta?.phoneNumberId || !meta?.accessToken) {
          testResult = { connected: false, error: 'Phone Number ID and Access Token are required. Get these from Meta Business Manager → WhatsApp → API Setup.' };
        } else {
          // Verify by calling Meta API
          try {
            const res = await fetch(`https://graph.facebook.com/v18.0/${meta.phoneNumberId}`, {
              headers: { Authorization: `Bearer ${meta.accessToken}` },
            });
            if (res.ok) {
              testResult = { connected: true, error: '' };
            } else {
              const data = await res.json().catch(() => ({}));
              testResult = { connected: false, error: `Meta API error: ${data?.error?.message || res.statusText}. Verify your Access Token is valid and not expired.` };
            }
          } catch {
            testResult = { connected: false, error: 'Cannot reach Meta API. Check your internet connection and try again.' };
          }
        }
        break;
      }
      case 'community': {
        const community = conn.community;
        if (!community?.groupName) {
          testResult = { connected: false, error: 'Group name is required. Enter your community group name.' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'domain': {
        const domain = conn.domain;
        if (domain?.wantToBuy) {
          testResult = { connected: false, error: '' };
          // Update status to pending-purchase
          await ServiceConnection.updateOne({ ownerId }, { $set: { 'domain.status': 'pending-purchase' } });
        } else if (!domain?.existingDomain) {
          testResult = { connected: false, error: 'Enter your existing domain name or select "I want to buy a domain".' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'sms': {
        const sms = conn.sms;
        if (!sms?.apiKey || !sms?.panNumber) {
          testResult = { connected: false, error: 'API Key and PAN number are required. Contact your SMS provider for API credentials.' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'call': {
        const call = conn.call;
        if (!call?.apiKey || !call?.apiSecret) {
          testResult = { connected: false, error: 'API Key and API Secret are required. Get these from your call provider dashboard.' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'qrWhatsApp': {
        const qr = conn.qrWhatsApp;
        if (!qr?.bridgeUrl) {
          testResult = { connected: false, error: 'Bridge URL is required. Deploy your WhatsApp bridge and enter the URL here.' };
        } else {
          // Test bridge health
          try {
            const res = await fetch(`${qr.bridgeUrl}/health`, {
              signal: AbortSignal.timeout(10000),
            });
            if (res.ok) {
              testResult = { connected: true, error: '' };
            } else {
              testResult = { connected: false, error: 'Bridge is not responding correctly. Ensure it is running and accessible.' };
            }
          } catch {
            testResult = { connected: false, error: 'Cannot reach bridge URL. Verify the URL is correct and the server is running.' };
          }
        }
        break;
      }
      case 'tally': {
        const tally = conn.tally;
        if (!tally?.companyName) {
          testResult = { connected: false, error: 'Company name is required.' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'payment': {
        const payment = conn.payment;
        if (!payment?.apiKey || !payment?.apiSecret) {
          testResult = { connected: false, error: 'API Key and Secret are required. Get these from your payment gateway dashboard.' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      case 'userDetails': {
        const ud = conn.userDetails;
        if (!ud?.businessName || !ud?.contactPhone) {
          testResult = { connected: false, error: 'Business name and contact phone are required.' };
        } else {
          testResult = { connected: true, error: '' };
        }
        break;
      }
      default:
        testResult = { connected: false, error: `Unknown service: ${service}` };
    }

    // Update connection status in DB
    await ServiceConnection.updateOne(
      { ownerId },
      {
        $set: {
          [`${service}.connected`]: testResult.connected,
          [`${service}.error`]: testResult.error,
          [`${service}.lastTestedAt`]: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      service,
      connected: testResult.connected,
      error: testResult.error,
    });
  } catch (error) {
    console.error('[Connections API] PUT (test) error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}
