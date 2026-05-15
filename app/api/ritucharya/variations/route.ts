import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const mongoUri = process.env.MONGODB_URI_MAIN || '';
const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function getDatabase() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  return client.db(dbName);
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const variations = await db.collection('ritucharya_variations').find({}).toArray();
    return NextResponse.json({ success: true, variations });
  } catch (error) {
    console.error('Error fetching variations:', error);
    return NextResponse.json({ error: 'Failed to fetch variations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDatabase();

    const result = await db.collection('ritucharya_variations').insertOne({
      ...body,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Error creating variation:', error);
    return NextResponse.json({ error: 'Failed to create variation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    const { ObjectId } = require('mongodb');

    await db.collection('ritucharya_variations').updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating variation:', error);
    return NextResponse.json({ error: 'Failed to update variation' }, { status: 500 });
  }
}
