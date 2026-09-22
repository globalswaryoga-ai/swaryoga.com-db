import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';

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

    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    const existingRes = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE document_id = ? AND collection_name = 'socialmediaaccounts'",
      args: [id]
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = JSON.parse(String(existingRes.rows[0].document_json || '{}'));
    
    // Verify scope
    if (scope.scopeType !== 'super_admin' && (account.scopeType !== 'tenant' || account.scopeKey !== scope.scopeKey)) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    account.isConnected = false;
    account.disconnectedAt = new Date().toISOString();
    account.updatedAt = new Date().toISOString();

    await bunnyExecute({
      sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE document_id = ?",
      args: [JSON.stringify(account), id]
    });

    if (account.platform === 'facebook' && account.accountId) {
      // Disconnect auto-connected instagram accounts
      const allRes = await bunnyExecute({
        sql: "SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
      });
      for (const row of allRes.rows) {
        try {
          const parsed = JSON.parse(String(row.document_json || '{}'));
          if (
            parsed.platform === 'instagram' &&
            parsed.metadata?.autoConnectedVia === 'facebook' &&
            parsed.metadata?.linkedPageId === account.accountId &&
            parsed.isConnected === true &&
            (scope.scopeType === 'super_admin' ? (parsed.scopeType === 'super_admin' || !parsed.scopeType) : (parsed.scopeType === 'tenant' && parsed.scopeKey === scope.scopeKey))
          ) {
            parsed.isConnected = false;
            parsed.disconnectedAt = new Date().toISOString();
            parsed.updatedAt = new Date().toISOString();
            await bunnyExecute({
              sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE document_id = ?",
              args: [JSON.stringify(parsed), String(row.id)]
            });
          }
        } catch {}
      }
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
