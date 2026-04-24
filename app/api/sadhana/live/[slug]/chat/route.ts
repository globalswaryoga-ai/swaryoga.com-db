import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsDb } from '@/lib/sadhanaPrograms';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { name, message } = await request.json();

    const cleanMsg = String(message || '').slice(0, 300).trim();
    if (!name || !cleanMsg) {
      return NextResponse.json({ error: 'name and message required' }, { status: 400 });
    }

    const db = await getProgramsDb();
    const chatCol = db.collection('sadhana_live_chat');
    const now = new Date();

    await chatCol.insertOne({
      programSlug: params.slug,
      name: String(name).slice(0, 50),
      message: cleanMsg,
      createdAt: now,
    });

    // Keep only last 200 messages per program
    const old = await chatCol
      .find({ programSlug: params.slug })
      .sort({ createdAt: -1 })
      .skip(200)
      .toArray();
    if (old.length > 0) {
      await chatCol.deleteMany({ _id: { $in: old.map((m: any) => m._id) } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/chat');
  }
}
