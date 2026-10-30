import { NextRequest, NextResponse } from 'next/server';
import { findInvestorForLogin } from '@/lib/bunnyInvestmentPortal';
import { issueInvestorToken } from '@/lib/investorSession';

export const dynamic = 'force-dynamic';

/**
 * POST /api/investment/portal/login
 * Sign in with WhatsApp phone + certificate number. Both must match.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || '');
    const certificateNumber = String(body.certificateNumber || '');

    const inv = await findInvestorForLogin(phone, certificateNumber);
    if (!inv) {
      // Same message for unknown phone, unknown certificate, or mismatch
      return NextResponse.json({ error: 'Phone number or certificate number is not correct' }, { status: 401 });
    }

    return NextResponse.json({ success: true, token: issueInvestorToken(inv.id) });
  } catch (error: any) {
    console.error('Error in POST /api/investment/portal/login:', error);
    return NextResponse.json({ error: 'Sign in failed. Please try again.' }, { status: 500 });
  }
}
