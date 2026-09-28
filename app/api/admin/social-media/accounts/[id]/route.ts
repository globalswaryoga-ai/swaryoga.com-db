import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { listBunnySocialAccounts, updateBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';

export const dynamic = 'force-dynamic';


export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const scope = await resolveSocialMediaScope(decoded);
    const { id } = params;

    const account = (await listBunnySocialAccounts({ scopeType: scope.scopeType, scopeKey: scope.scopeKey, connectedOnly: false }))
      .find((row: any) => String(row._id) === id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    await updateBunnySocialAccount(id, { isConnected: false, disconnectedAt: new Date().toISOString() });

    if (account.platform === 'facebook' && account.accountId) {
      // Disconnect auto-connected instagram accounts
      const linked = (await listBunnySocialAccounts({ scopeType: scope.scopeType, scopeKey: scope.scopeKey, connectedOnly: true }))
        .filter((row: any) => row.platform === 'instagram' && row.metadata?.autoConnectedVia === 'facebook' && row.metadata?.linkedPageId === account.accountId);
      await Promise.all(linked.map((row: any) => updateBunnySocialAccount(String(row._id), { isConnected: false, disconnectedAt: new Date().toISOString() })));
    }

    return NextResponse.json({
      success: true,
      message: 'Account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
