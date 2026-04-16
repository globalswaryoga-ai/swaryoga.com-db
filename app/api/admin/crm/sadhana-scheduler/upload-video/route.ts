import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadToBunnyStream } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large uploads

// Vercel actual limit: ~100-110MB for entire request (including multipart encoding overhead of ~10%)
// 50MB file + overhead = ~55MB total request (safe)
// WARNING: Files > 50MB will fail with FUNCTION_PAYLOAD_TOO_LARGE
// For very large videos (>50MB), implement chunked upload
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (realistic Vercel limit)

/**
 * POST /api/admin/crm/sadhana-scheduler/upload-video
 * Upload Sadhana video directly to Bunny Stream (library 638748)
 * Returns direct CDN stream URL for Zoom Live Stream API
 */
export async function POST(request: NextRequest) {
  // Wrap EVERYTHING to guarantee JSON response
  try {
    // ===== STEP 1: Authentication =====
    try {
      console.log('[Sadhana Video Upload] 1️⃣ Request received');
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('[Sadhana Video Upload] 1️⃣ ERROR: No auth header');
        return safeJsonResponse({ error: 'Authentication required' }, 401);
      }

      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        console.error('[Sadhana Video Upload] 1️⃣ ERROR: Token verification failed');
        return safeJsonResponse({ error: 'Authentication required' }, 401);
      }
      console.log('[Sadhana Video Upload] 1️⃣ ✅ User authenticated:', decoded.userId);
    } catch (authErr) {
      console.error('[Sadhana Video Upload] 1️⃣ ERROR (catch):', authErr);
      return safeJsonResponse({ error: 'Authentication failed' }, 401);
    }

    // ===== STEP 2: Parse FormData =====
    let file: File | null = null;
    try {
      console.log('[Sadhana Video Upload] 2️⃣ Parsing formdata...');
      const formData = await request.formData();
      file = formData.get('file') as File;
      if (!file) {
        console.error('[Sadhana Video Upload] 2️⃣ ERROR: No file in form data');
        return safeJsonResponse({ error: 'No file provided' }, 400);
      }
      console.log('[Sadhana Video Upload] 2️⃣ ✅ File received:', { 
        name: file.name, 
        size: file.size, 
        type: file.type,
        sizeMB: Math.round(file.size / 1024 / 1024)
      });
    } catch (parseErr) {
      console.error('[Sadhana Video Upload] 2️⃣ ERROR (catch):', parseErr);
      return safeJsonResponse({ error: 'Failed to parse upload' }, 400);
    }

    // ===== STEP 3: Validate File =====
    try {
      console.log('[Sadhana Video Upload] 3️⃣ Validating file...');
      
      if (file.size > MAX_VIDEO_SIZE) {
        const msg = `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum: 200MB`;
        console.error('[Sadhana Video Upload] 3️⃣ ERROR: ' + msg);
        return safeJsonResponse({ error: msg }, 400);
      }

      const allowedMimeTypes = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        const msg = `Invalid format: ${file.type}. Allowed: MP4, WebM, MOV, AVI`;
        console.error('[Sadhana Video Upload] 3️⃣ ERROR: ' + msg);
        return safeJsonResponse({ error: msg }, 400);
      }

      console.log('[Sadhana Video Upload] 3️⃣ ✅ File validated');
    } catch (validErr) {
      console.error('[Sadhana Video Upload] 3️⃣ ERROR (catch):', validErr);
      return safeJsonResponse({ error: 'File validation failed' }, 400);
    }

    // ===== STEP 4: Convert to Buffer =====
    let buffer: Buffer | null = null;
    try {
      console.log('[Sadhana Video Upload] 4️⃣ Converting to buffer...');
      buffer = Buffer.from(await file.arrayBuffer());
      console.log('[Sadhana Video Upload] 4️⃣ ✅ Buffer created:', {
        bytes: buffer.length,
        mb: Math.round(buffer.length / 1024 / 1024)
      });
    } catch (bufErr) {
      console.error('[Sadhana Video Upload] 4️⃣ ERROR (catch):', bufErr);
      return safeJsonResponse({ error: 'Failed to read file' }, 400);
    }

    // ===== STEP 5: Upload to Bunny =====
    let streamUrl: string | null = null;
    try {
      console.log('[Sadhana Video Upload] 5️⃣ Starting Bunny upload...');
      streamUrl = await uploadToBunnyStream(
        buffer,
        file.name,
        file.name.split('.')[0],
        'sadhana'
      );
      console.log('[Sadhana Video Upload] 5️⃣ ✅ Upload successful! URL:', streamUrl);
    } catch (bunnyErr) {
      const errorMsg = bunnyErr instanceof Error ? bunnyErr.message : String(bunnyErr);
      console.error('[Sadhana Video Upload] 5️⃣ ERROR: Bunny upload failed:', errorMsg);
      console.error('[Sadhana Video Upload] 5️⃣ ERROR (full):', bunnyErr);
      return safeJsonResponse({ 
        error: `Upload failed: ${errorMsg}`,
        details: process.env.NODE_ENV === 'development' ? String(bunnyErr) : undefined
      }, 500);
    }

    // ===== STEP 6: Build Response =====
    try {
      console.log('[Sadhana Video Upload] 6️⃣ Building response...');
      if (!streamUrl) {
        console.error('[Sadhana Video Upload] 6️⃣ ERROR: No stream URL returned');
        return safeJsonResponse({ error: 'No URL returned from upload' }, 500);
      }

      const response = {
        success: true,
        data: {
          url: streamUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          streamType: 'bunny-stream-direct',
          usage: 'Paste this URL into Sadhana Scheduler',
        },
      };

      console.log('[Sadhana Video Upload] 6️⃣ ✅ Response ready');
      return safeJsonResponse(response, 200);
    } catch (respErr) {
      console.error('[Sadhana Video Upload] 6️⃣ ERROR (catch):', respErr);
      return safeJsonResponse({ error: 'Failed to format response' }, 500);
    }

  } catch (outerErr) {
    // Absolute fallback - ALWAYS return valid JSON
    console.error('[Sadhana Video Upload] ❌ OUTER ERROR:', outerErr);
    return safeJsonResponse({ 
      error: 'Unexpected error during upload',
      details: process.env.NODE_ENV === 'development' ? String(outerErr) : undefined
    }, 500);
  }
}

/**
 * Safe JSON response wrapper - ALWAYS returns valid JSON
 */
function safeJsonResponse(data: any, status: number): NextResponse {
  try {
    // Ensure data is serializable
    const serialized = JSON.parse(JSON.stringify(data));
    return NextResponse.json(serialized, { status });
  } catch (e) {
    console.error('[Sadhana Upload] CRITICAL: Could not serialize response:', data, e);
    // Fallback - return a simple error
    return NextResponse.json(
      { error: 'Upload failed' },
      { status }
    );
  }
}
