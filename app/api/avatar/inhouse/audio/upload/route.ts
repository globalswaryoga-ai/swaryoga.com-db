import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { generateAvatarAudioPresignedUrl, uploadUserFile } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

function isSupportedAudio(buffer: Buffer, extension: string): boolean {
  if (extension === 'wav') {
    return buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WAVE';
  }
  if (extension === 'mp3') {
    return buffer.length >= 3 &&
      (buffer.toString('ascii', 0, 3) === 'ID3' ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0));
  }
  return false;
}

export async function POST(request: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(request));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const userId = getViewerUserId(decoded);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Admin user identity is missing.' }, { status: 401 });
  }
  if (!process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY || !process.env.BUNNY_AVATAR_AUDIO_CDN_HOST) {
    return NextResponse.json({
      success: false,
      error: 'Recorded speech upload requires the dedicated AvatarMohan Bunny CDN host and token key; no file was uploaded.',
    }, { status: 503 });
  }
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 1024 * 1024) {
    return NextResponse.json({ success: false, error: 'Recording must be 25 MB or smaller.' }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Choose a non-empty MP3 or WAV recording.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Recording must be 25 MB or smaller.' }, { status: 413 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isSupportedAudio(buffer, extension)) {
      return NextResponse.json({
        success: false,
        error: 'Recording must be a valid MP3 or WAV file. Renaming another format is not supported.',
      }, { status: 415 });
    }

    const contentType = extension === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const uploaded = await uploadUserFile(buffer, file.name, userId, 'avatar-audio', contentType);
    const previewUrl = await generateAvatarAudioPresignedUrl(uploaded.storagePath, { expiresIn: MAX_URL_TTL_SECONDS });

    return NextResponse.json({
      success: true,
      audioStoragePath: uploaded.storagePath,
      audioUrl: previewUrl,
      fileName: file.name,
      fileSize: uploaded.sizeBytes,
      message: 'Recording uploaded to your user-scoped Bunny storage. The signed playback URL expires in seven days.',
    }, { status: 201 });
  } catch (error) {
    console.error('[API inhouse-audio upload] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload recorded speech.',
    }, { status: 500 });
  }
}
