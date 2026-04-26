import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    if (!token) {
      return apiError('UNAUTHORIZED', 'No token provided');
    }
    const decoded = await verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized');
    }

    const providerUrl =
      process.env.QR_WHATSAPP_CONNECT_URL || 'https://wa.waofficialapi.in/whatsapp_profiles/oauth';

    // Minimal stub for UI parity. This returns the provider URL that the QR inbox page should open.
    return apiSuccess({
      ok: true,
      connected: false,
      next: {
        kind: 'oauth',
        url: providerUrl,
      },
    });
  } catch (err: any) {
    return apiError('SERVER_ERROR', err?.message || 'Failed');
  }
}
