import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { verifyAvatarConsent } from '@/lib/avatarEngine/consentService';
import {
  analyzeFaceGeometry,
  createAvatarIdentityProfile,
  FaceAnalysisUnavailableError,
} from '@/lib/avatarEngine/faceIdentityService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) {
    return NextResponse.json({ success: false, error: 'Admin user identity is missing.' }, { status: 401 });
  }
  try {
    const res = await bunnyExecute({
      sql: isSuperAdmin(decoded)
        ? 'SELECT * FROM avatar_identity_profiles_sql WHERE is_active = 1 ORDER BY created_at DESC'
        : 'SELECT * FROM avatar_identity_profiles_sql WHERE is_active = 1 AND user_id = ? ORDER BY created_at DESC',
      args: isSuperAdmin(decoded) ? [] : [viewerId],
    });
    return NextResponse.json({
      success: true,
      total: res.rows?.length || 0,
      profiles: res.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) {
    return NextResponse.json({ success: false, error: 'Admin user identity is missing.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      name,
      gender,
      ageGroup,
      defaultClothing,
      defaultHair,
      frontalFaceUrl,
      bgRemovedUrl,
      consentRecordId,
      additionalPhotos,
    } = body;

    if (typeof name !== 'string' || !name.trim() || typeof frontalFaceUrl !== 'string' || !frontalFaceUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Avatar name and frontalFaceUrl are required.' },
        { status: 400 }
      );
    }
    if (typeof consentRecordId !== 'string' || !(await verifyAvatarConsent({
      consentId: consentRecordId,
      userId: viewerId,
      avatarName: name.trim(),
    }))) {
      return NextResponse.json(
        { success: false, error: 'A valid consent record for this avatar name is required.' },
        { status: 400 }
      );
    }

    // Step 1: Pre-flight face geometry analysis
    const analysis = analyzeFaceGeometry();

    // Step 2: Create Avatar Identity Profile
    const profile = await createAvatarIdentityProfile({
      userId: viewerId,
      name: name.trim(),
      gender: gender || 'male',
      ageGroup: ageGroup || 'adult',
      defaultClothing: defaultClothing || 'Traditional Kurta',
      defaultHair: defaultHair || 'Natural Tied',
      frontalFaceUrl,
      bgRemovedUrl: bgRemovedUrl || null,
      consentRecordId,
      qualityScore: analysis.qualityScore,
    });

    // Step 3: Register primary frontal photo in avatar_photos_sql
    const primaryPhotoId = `photo_${Date.now()}_primary`;
    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `INSERT INTO avatar_photos_sql (
        id, profile_id, photo_url, photo_angle, width, height, bg_removed_url,
        landmarks_json, is_primary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        primaryPhotoId,
        profile.id,
        frontalFaceUrl,
        'frontal',
        1080,
        1080,
        bgRemovedUrl || null,
        JSON.stringify(analysis.box),
        now,
      ],
    });

    // Step 4: Register any additional multi-angle photos
    if (Array.isArray(additionalPhotos) && additionalPhotos.length > 0) {
      for (let i = 0; i < additionalPhotos.length; i++) {
        const p = additionalPhotos[i];
        if (p?.url) {
          await bunnyExecute({
            sql: `INSERT INTO avatar_photos_sql (
              id, profile_id, photo_url, photo_angle, width, height, bg_removed_url,
              landmarks_json, is_primary, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            args: [
              `photo_${Date.now()}_${i}`,
              profile.id,
              p.url,
              p.angle || 'multi_angle',
              p.width || 1080,
              p.height || 1080,
              p.bgRemovedUrl || null,
              null,
              now,
            ],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      profile,
      analysis,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Avatar creation failed' },
      { status: error instanceof FaceAnalysisUnavailableError ? 503 : 500 }
    );
  }
}
