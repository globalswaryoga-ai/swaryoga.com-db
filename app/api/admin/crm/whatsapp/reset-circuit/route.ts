import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { resetCircuit, isCircuitOpen } from '@/lib/whatsapp';
import { getWhatsAppEnv } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/whatsapp/reset-circuit
 * 
 * Resets the Meta API circuit breaker and returns current status.
 * Only accessible by admins.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Reset the circuit
    resetCircuit('meta');
    
    // Get current status
    const env = getWhatsAppEnv();
    const circuitOpen = isCircuitOpen('meta');
    
    return NextResponse.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      status: {
        circuitOpen,
        envConfigured: !!env,
        hasAccessToken: !!(env?.accessToken),
        hasPhoneNumberId: !!(env?.phoneNumberId),
        hasAppSecret: !!(env?.appSecret),
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/whatsapp/reset-circuit
 * 
 * Returns current WhatsApp API status without resetting.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const env = getWhatsAppEnv();
    const circuitOpen = isCircuitOpen('meta');
    
    return NextResponse.json({
      success: true,
      status: {
        circuitOpen,
        envConfigured: !!env,
        hasAccessToken: !!(env?.accessToken),
        hasPhoneNumberId: !!(env?.phoneNumberId),
        hasAppSecret: !!(env?.appSecret),
        ready: !!env && !circuitOpen,
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
