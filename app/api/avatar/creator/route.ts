import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  analyzeFaceGeometry,
  createAvatarIdentityProfile,
} from '@/lib/avatarEngine/faceIdentityService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await bunnyExecute('SELECT * FROM avatar_identity_profiles_sql WHERE is_active = 1 ORDER BY created_at DESC');
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
  try {
    const body = await req.json();
    const {
      userId,
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

    if (!name || !frontalFaceUrl) {
      return NextResponse.json(
        { success: false, error: 'Avatar name and frontalFaceUrl are required.' },
        { status: 400 }
      );
    }

    // Step 1: Pre-flight face geometry analysis
    const analysis = analyzeFaceGeometry(1080, 1080);

    // Step 2: Create Avatar Identity Profile
    const profile = await createAvatarIdentityProfile({
      userId: userId || 'admincrm',
      name,
      gender: gender || 'male',
      ageGroup: ageGroup || 'adult',
      defaultClothing: defaultClothing || 'Traditional Kurta',
      defaultHair: defaultHair || 'Natural Tied',
      frontalFaceUrl,
      bgRemovedUrl: bgRemovedUrl || null,
      consentRecordId: consentRecordId || null,
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
      { status: 500 }
    );
  }
}

