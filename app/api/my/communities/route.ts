/**
 * User Community API - Get user's communities and recordings
 * 
 * GET - Get user's communities
 * ?recordings=true - Include recordings
 * ?batchId=xxx - Filter recordings by batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserCommunities, getUserRecordings } from '@/lib/community-manager';

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRecordings = searchParams.get('recordings') === 'true';
    const batchId = searchParams.get('batchId') || undefined;
    const workshopId = searchParams.get('workshopId') || undefined;

    // Get user's communities
    const communities = await getUserCommunities(decoded.userId);

    const response: {
      success: boolean;
      communities: {
        global: unknown;
        oldSadhak: unknown;
        activeWorkshops: unknown[];
      };
      recordings?: {
        common: unknown[];
        batchWise: unknown[];
        total: number;
      };
    } = {
      success: true,
      communities: {
        global: communities.global ? {
          id: communities.global._id,
          name: communities.global.name,
          description: communities.global.description,
          type: communities.global.type,
        } : null,
        oldSadhak: communities.oldSadhak ? {
          id: communities.oldSadhak._id,
          name: communities.oldSadhak.name,
          description: communities.oldSadhak.description,
          type: communities.oldSadhak.type,
          mergedWorkshopCount: communities.oldSadhak.mergedWorkshopIds?.length || 0,
        } : null,
        activeWorkshops: communities.activeWorkshops.map(c => ({
          id: c._id,
          name: c.name,
          description: c.description,
          type: c.type,
          workshopId: c.workshopId,
        })),
      },
    };

    // Include recordings if requested
    if (includeRecordings) {
      const recordings = await getUserRecordings(decoded.userId, {
        batchId,
        workshopId,
      });

      response.recordings = {
        common: recordings.common.map(r => ({
          id: r._id,
          title: r.title,
          description: r.description,
          s3Key: r.s3Key,
          duration: r.duration,
          thumbnailUrl: r.thumbnailUrl,
          recordingType: r.recordingType,
          tags: r.tags,
          createdAt: r.createdAt,
        })),
        batchWise: recordings.batchWise.map(r => ({
          id: r._id,
          title: r.title,
          description: r.description,
          s3Key: r.s3Key,
          duration: r.duration,
          thumbnailUrl: r.thumbnailUrl,
          workshopId: r.workshopId,
          batchId: r.batchId,
          recordingType: r.recordingType,
          tags: r.tags,
          createdAt: r.createdAt,
        })),
        total: recordings.total,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user communities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    );
  }
}
