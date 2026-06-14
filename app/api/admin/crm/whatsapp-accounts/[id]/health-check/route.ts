import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { Types } from 'mongoose';
import { decryptCredential } from '@/lib/encryption';
import { generateAppSecretProof } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded);

    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const account = await WhatsAppAccount.findOne({ _id: params.id, ...tf });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    let healthStatus = 'down';
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let connectionError = '';

    // Perform a real health check based on account type
    if (account.accountType === 'meta' && account.metaAccessToken && account.metaPhoneNumberId) {
      try {
        const accessToken = decryptCredential(account.metaAccessToken);
        const proof = generateAppSecretProof(accessToken);
        const proofParam = proof ? `&appsecret_proof=${proof}` : '';
        const res = await fetch(
          `https://graph.facebook.com/v24.0/${encodeURIComponent(account.metaPhoneNumberId)}?fields=display_phone_number,verified_name${proofParam}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.id) {
          healthStatus = 'healthy';
          connectionStatus = 'connected';
          connectionError = '';
        } else {
          healthStatus = 'down';
          connectionStatus = 'error';
          connectionError = data?.error?.message || `Meta API error (HTTP ${res.status})`;
        }
      } catch (err) {
        healthStatus = 'down';
        connectionStatus = 'error';
        connectionError = err instanceof Error ? err.message : 'Meta API connection failed';
      }
    } else if (account.accountType === 'common' && account.commonApiKey) {
      // No generic gateway API to ping yet — treat presence of credentials as healthy.
      healthStatus = 'healthy';
      connectionStatus = 'connected';
      connectionError = '';
    } else {
      healthStatus = 'down';
      connectionStatus = 'error';
      connectionError = 'Missing credentials';
    }

    const updated = await WhatsAppAccount.findOneAndUpdate(
      { _id: params.id, ...tf },
      {
        healthStatus,
        status: connectionStatus,
        connectionError: connectionError || undefined,
        lastHealthCheck: new Date(),
      },
      { new: true }
    )
      .select('-metaAccessToken -metaVerifyToken -commonApiKey -commonApiSecret')
      .lean();

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
