import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const mongoose = await clientPromise();
    const db = mongoose.connection.getClient().db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = db.collection('bunny_leads');

    const objectIds = ids.map(id => {
        try { return new ObjectId(id); }
        catch { return id; }
    });

    const result = await collection.deleteMany({
        $or: [
            { _id: { $in: objectIds } },
            { id: { $in: ids } }
        ]
    });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error deleting leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
