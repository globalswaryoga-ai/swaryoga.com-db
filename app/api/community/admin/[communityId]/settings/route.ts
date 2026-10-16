import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getCommunity, initCommunitySchema } from '@/lib/bunnyCommunityRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId } = params;
    const { name, whatsappGroupId, description, joinLink } = await request.json();

    await initCommunitySchema();

    const existing = await getCommunity(communityId);
    const rawDoc = existing?.rawDoc || {};
    if (whatsappGroupId !== undefined) rawDoc.whatsappGroupId = whatsappGroupId;
    if (joinLink !== undefined) rawDoc.joinLink = joinLink;
    if (name !== undefined) rawDoc.name = name;
    if (description !== undefined) rawDoc.description = description;

    const updatedName = name || existing?.name || communityId;
    const updatedDesc = description !== undefined ? description : (existing?.description || '');
    const nowIso = new Date().toISOString();

    await bunnyExecute({
      sql: `INSERT INTO communities_sql (id, slug, name, description, type, is_archived, raw_doc_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'global', 0, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              description = excluded.description,
              raw_doc_json = excluded.raw_doc_json,
              updated_at = excluded.updated_at`,
      args: [communityId, communityId, updatedName, updatedDesc, JSON.stringify(rawDoc), nowIso, nowIso],
    });

    const updated = {
      id: communityId,
      _id: communityId,
      name: updatedName,
      description: updatedDesc,
      whatsappGroupId: rawDoc.whatsappGroupId || '',
      joinLink: rawDoc.joinLink || '',
      ...rawDoc,
    };

    return NextResponse.json({
      success: true,
      message: 'Community settings updated',
      community: updated,
    });
  } catch (error) {
    console.error('Update community settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId } = params;
    const comm = await getCommunity(communityId);

    if (!comm) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const result = {
      ...comm.rawDoc,
      id: comm.id,
      _id: comm.id,
      name: comm.name,
      description: comm.description,
      slug: comm.slug,
      whatsappGroupId: comm.rawDoc?.whatsappGroupId || '',
      joinLink: comm.rawDoc?.joinLink || '',
    };

    return NextResponse.json({
      success: true,
      community: result,
    });
  } catch (error) {
    console.error('Get community settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
