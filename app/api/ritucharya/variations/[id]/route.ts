import { MongoClient, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const mongoUri = process.env.MONGODB_URI_MAIN || '';
const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function getDatabase() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  return client.db(dbName);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();

    const result = await db.collection('ritucharya_variations').deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Variation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting variation:', error);
    return NextResponse.json({ error: 'Failed to delete variation' }, { status: 500 });
  }
}
