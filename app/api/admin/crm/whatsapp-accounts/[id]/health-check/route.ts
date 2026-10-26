import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getBunnyWhatsAppAccountById } from '@/lib/bunnyWhatsAppAccounts';
import { decryptCredential } from '@/lib/encryption';
import { generateAppSecretProof } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

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

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const account = await getBunnyWhatsAppAccountById(params.id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!superAdmin && account.createdByUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let healthStatus = 'down';
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let connectionError = '';

    if (account.metaAccessToken && account.metaPhoneNumberId) {
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
        } else {
          connectionStatus = 'error';
          connectionError = data?.error?.message || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        connectionStatus = 'error';
        connectionError = err.message || 'Network error';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        accountId: params.id,
        healthStatus,
        connectionStatus,
        connectionError,
        checkedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
