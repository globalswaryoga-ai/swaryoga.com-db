import { NextRequest, NextResponse } from 'next/server';
import { Db } from 'mongodb';

let announcementDb: Db | null = null;

async function getAnnouncementDb() {
  if (announcementDb) return announcementDb;
  try {
    const { connectToDatabase } = await import('@/lib/mongodb');
    const db = await connectToDatabase();
    announcementDb = db;
    return db;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

async function getAnnouncementCollection() {
  const db = await getAnnouncementDb();
  return db.collection('sadhana_announcements');
}

export async function GET() {
  try {
    const col = await getAnnouncementCollection();
    const announcement = await col.findOne({});

    return NextResponse.json({
      success: true,
      announcement: announcement?.text || '',
    });
  } catch (error) {
    console.error('GET announcement error:', error);
    return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    const col = await getAnnouncementCollection();

    await col.updateOne(
      {},
      { $set: { text: String(text || ''), updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST announcement error:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
