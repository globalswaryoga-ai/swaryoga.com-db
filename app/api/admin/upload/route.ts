/**
 * Image Upload API
 * POST /api/admin/upload — Upload an image file, returns a URL
 * 
 * Stores image as base64 in MongoDB (for small thumbnails < 2MB).
 * Returns a servable URL: /api/admin/upload/{id}
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// Simple schema for uploaded images
const uploadSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  size: Number,
  data: String, // base64 encoded
  uploadedBy: String,
  createdAt: { type: Date, default: Date.now },
});

function getUploadModel() {
  return mongoose.models.Upload || mongoose.model('Upload', uploadSchema);
}

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: `File too large. Max ${MAX_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    // Convert to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    const Upload = getUploadModel();
    const doc = await Upload.create({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64,
      uploadedBy: decoded.userId || decoded.email || 'admin',
    });

    const url = `/api/admin/upload/${doc._id}`;

    return NextResponse.json({
      success: true,
      data: { url, id: doc._id, filename: file.name, size: file.size },
    });
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
