import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Community } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/community/list
 * Returns all communities with their design metadata
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch all communities from database
    const communities = await Community.find({})
      .select('id name isPublic category createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with design info from communityColorSystem
    const enrichedCommunities = communities.map((community: any) => {
      const design = COMMUNITY_DESIGNS.find(d => d.id === community.id);
      return {
        id: community.id || community._id?.toString(),
        name: community.name || design?.name || 'Unnamed Community',
        isPublic: community.isPublic ?? design?.isPublic ?? false,
        category: community.category || design?.category || 'common',
        icon: design?.icon ? design.icon.name : 'Globe', // Store icon name as string
        color: design?.color?.main || 'text-gray-400',
        bg: design?.color?.light || 'bg-gray-50 border-gray-200',
      };
    });

    // Group by category
    const grouped: Record<string, any[]> = {};
    enrichedCommunities.forEach((community: any) => {
      const cat = String(community.category).toUpperCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(community);
    });

    return NextResponse.json({
      success: true,
      communities: enrichedCommunities,
      grouped,
      total: enrichedCommunities.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching communities:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    );
  }
}
