import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsDb } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programSlug = searchParams.get('programSlug');
    const limit = parseInt(searchParams.get('limit') || '100');

    const db = await getProgramsDb();
    const chatCol = db.collection('sadhana_live_chat');

    const query: any = {};
    if (programSlug) {
      query.programSlug = programSlug;
    }

    const messages = await chatCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      messages: messages.map((m: any) => ({
        id: m._id.toString(),
        programSlug: m.programSlug,
        name: m.name,
        message: m.message,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET admin/sadhana-chat');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const db = await getProgramsDb();
    const chatCol = db.collection('sadhana_live_chat');

    await chatCol.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE admin/sadhana-chat');
  }
}
