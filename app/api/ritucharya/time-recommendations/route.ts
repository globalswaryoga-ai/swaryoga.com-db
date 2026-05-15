import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI_MAIN || '';
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'crm_planner';
const COLLECTION_NAME = 'ritucharya_time_recommendations';

interface TimeSlotRecommendation {
  time: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
}

interface TimeRecommendationDoc {
  _id?: ObjectId;
  rituId: string;
  timeSlots: TimeSlotRecommendation[];
  updatedAt: Date;
  createdAt: Date;
}

async function getDb() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rituId = searchParams.get('rituId');

    const db = await getDb();
    const collection = db.collection<TimeRecommendationDoc>(COLLECTION_NAME);

    if (rituId) {
      const doc = await collection.findOne({ rituId });
      return Response.json(doc || null);
    }

    const docs = await collection.find({}).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error('GET error:', error);
    return Response.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as TimeRecommendationDoc;
    const { rituId, timeSlots } = body;

    if (!rituId || !Array.isArray(timeSlots)) {
      return Response.json({ error: 'Invalid data' }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<TimeRecommendationDoc>(COLLECTION_NAME);

    const result = await collection.updateOne(
      { rituId },
      {
        $set: {
          rituId,
          timeSlots,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return Response.json({ success: true, matchedCount: result.matchedCount });
  } catch (error) {
    console.error('POST error:', error);
    return Response.json({ error: 'Failed to save recommendations' }, { status: 500 });
  }
}
