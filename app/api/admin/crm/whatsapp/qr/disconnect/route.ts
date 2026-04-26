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
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized');
    }

    // Minimal stub for UI parity. We'll wire this to waofficialapi instance disconnect.
    return apiSuccess({ ok: true, connected: false });
  } catch (err: any) {
    return apiError('SERVER_ERROR', err?.message || 'Failed');
  }
}
