/**
 * Serve uploaded images
 * GET /api/admin/upload/[id] — Returns the image with correct content type
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  size: Number,
  data: String,
  uploadedBy: String,
  createdAt: { type: Date, default: Date.now },
});

function getUploadModel() {
  return mongoose.models.Upload || mongoose.model('Upload', uploadSchema);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const Upload = getUploadModel();
    const doc = await Upload.findById(id);

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = Buffer.from(doc.data, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': doc.mimeType || 'image/jpeg',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('[Upload Serve] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
