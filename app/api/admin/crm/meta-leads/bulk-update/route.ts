import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { ids, status } = await req.json();

    if (!ids || !ids.length || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb('swaryoga-ai');
    
    // Convert string IDs to ObjectIds
    const objectIds = ids.map((id: string) => {
        try { return new ObjectId(id); }
        catch (e) { return id; }
    });

    const result = await db.collection('leads').updateMany(
      { $or: [ { _id: { $in: objectIds } }, { id: { $in: ids } } ] },
      { $set: { status: status, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    console.error('Error updating bulk leads status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
