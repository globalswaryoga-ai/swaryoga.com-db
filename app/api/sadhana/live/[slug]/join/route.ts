import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsDb } from '@/lib/sadhanaPrograms';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { sessionId, name } = await request.json();
    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }

    const db = await getProgramsDb();
    const participants = db.collection('sadhana_live_participants');
    const now = new Date();

    await participants.updateOne(
      { sessionId, programSlug: params.slug },
      {
        $set: {
          sessionId,
          programSlug: params.slug,
          name: String(name).slice(0, 50),
          lastSeen: now,
        },
        $setOnInsert: { joinedAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/join');
  }
}
