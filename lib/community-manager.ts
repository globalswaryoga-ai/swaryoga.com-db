/**
 * Community Manager - Handles 3-tier community system
 * 
 * Community Types:
 * 1. global - Public community for everyone
 * 2. old_sadhak - Alumni community for users who completed workshops
 * 3. workshop_active - Per-workshop community, merges into old_sadhak after completion
 * 
 * Flow:
 * - Workshop created → workshop_active community created
 * - User enrolls → Added to workshop_active community
 * - Workshop completes → workshop_active merges into old_sadhak
 * - All members & recordings transfer to old_sadhak
 */

import mongoose from 'mongoose';
import { connectDB, Community, CommunityMembership, CommunityVideo } from './db';

// Community type constants
export const COMMUNITY_TYPES = {
  GLOBAL: 'global',
  OLD_SADHAK: 'old_sadhak',
  WORKSHOP_ACTIVE: 'workshop_active',
} as const;

// Well-known community IDs (created once, used forever)
export const WELL_KNOWN_COMMUNITIES = {
  GLOBAL: 'global-community',
  OLD_SADHAK: 'old-sadhak-community',
};

interface CreateCommunityInput {
  name: string;
  description?: string;
  type: 'global' | 'old_sadhak' | 'workshop_active';
  workshopId?: string;
  parentCommunityId?: string;
}

interface MergeResult {
  success: boolean;
  membersTransferred: number;
  videosTransferred: number;
  error?: string;
}

/**
 * Initialize the system communities (Global and Old Sadhak)
 * Call this once during app startup or on first admin access
 */
export async function initializeSystemCommunities(): Promise<{
  global: typeof Community.prototype;
  oldSadhak: typeof Community.prototype;
}> {
  await connectDB();

  // Create or get Global Community
  let globalCommunity = await Community.findOne({ type: COMMUNITY_TYPES.GLOBAL });
  if (!globalCommunity) {
    globalCommunity = await Community.create({
      id: WELL_KNOWN_COMMUNITIES.GLOBAL,
      name: 'Swar Yoga Global Community',
      description: 'Public community for all Swar Yoga practitioners and enthusiasts',
      type: COMMUNITY_TYPES.GLOBAL,
      isArchived: false,
    });
    console.log('✅ Created Global Community');
  }

  // Create or get Old Sadhak Community
  let oldSadhakCommunity = await Community.findOne({ type: COMMUNITY_TYPES.OLD_SADHAK });
  if (!oldSadhakCommunity) {
    oldSadhakCommunity = await Community.create({
      id: WELL_KNOWN_COMMUNITIES.OLD_SADHAK,
      name: 'Swar Yoga Sadhak Alumni',
      description: 'Community for practitioners who have completed Swar Yoga workshops',
      type: COMMUNITY_TYPES.OLD_SADHAK,
      isArchived: false,
      mergedWorkshopIds: [],
    });
    console.log('✅ Created Old Sadhak Community');
  }

  return { global: globalCommunity, oldSadhak: oldSadhakCommunity };
}

/**
 * Create a new workshop-active community
 */
export async function createWorkshopCommunity(
  workshopId: string,
  workshopName: string,
  description?: string
): Promise<typeof Community.prototype> {
  await connectDB();

  // Get or create Old Sadhak community as parent
  const { oldSadhak } = await initializeSystemCommunities();

  const community = await Community.create({
    id: `workshop-${workshopId}`,
    name: `${workshopName} Community`,
    description: description || `Community for ${workshopName} participants`,
    type: COMMUNITY_TYPES.WORKSHOP_ACTIVE,
    workshopId: new mongoose.Types.ObjectId(workshopId),
    parentCommunityId: oldSadhak._id,
    isArchived: false,
  });

  console.log(`✅ Created workshop community: ${community.name}`);
  return community;
}

/**
 * Add a member to a community
 */
export async function addMemberToCommunity(
  communityId: string,
  userId: string,
  memberInfo: {
    name: string;
    email?: string;
    mobile?: string;
    role?: 'member' | 'moderator' | 'admin';
  }
): Promise<typeof CommunityMembership.prototype> {
  await connectDB();

  // Check if already a member
  const existing = await CommunityMembership.findOne({
    communityId,
    userId,
  });

  if (existing) {
    // Reactivate if previously left
    if (existing.status === 'left' || existing.status === 'suspended') {
      existing.status = 'active';
      existing.joinedAt = new Date();
      await existing.save();
    }
    return existing;
  }

  // Create new membership
  const membership = await CommunityMembership.create({
    communityId,
    userId,
    name: memberInfo.name,
    email: memberInfo.email,
    mobile: memberInfo.mobile,
    role: memberInfo.role || 'member',
    status: 'active',
    joinedAt: new Date(),
  });

  // Also add to Community.members array for quick lookup
  await Community.updateOne(
    { _id: communityId },
    { $addToSet: { members: userId } }
  );

  return membership;
}

/**
 * Add user to workshop community when they enroll
 */
export async function addUserToWorkshopCommunity(
  workshopId: string,
  userId: string,
  userInfo: { name: string; email?: string; mobile?: string }
): Promise<typeof CommunityMembership.prototype | null> {
  await connectDB();

  // Find the workshop's community
  const community = await Community.findOne({
    workshopId: new mongoose.Types.ObjectId(workshopId),
    type: COMMUNITY_TYPES.WORKSHOP_ACTIVE,
    isArchived: false,
  });

  if (!community) {
    console.warn(`No active community found for workshop ${workshopId}`);
    return null;
  }

  return addMemberToCommunity(community._id.toString(), userId, userInfo);
}

/**
 * Merge a workshop community into Old Sadhak community
 * Called when workshop is marked as complete
 */
export async function mergeWorkshopCommunity(
  workshopId: string
): Promise<MergeResult> {
  await connectDB();

  const workshopObjId = new mongoose.Types.ObjectId(workshopId);

  // Find the workshop's active community
  const workshopCommunity = await Community.findOne({
    workshopId: workshopObjId,
    type: COMMUNITY_TYPES.WORKSHOP_ACTIVE,
    isArchived: false,
  });

  if (!workshopCommunity) {
    return {
      success: false,
      membersTransferred: 0,
      videosTransferred: 0,
      error: 'No active community found for this workshop',
    };
  }

  // Get or create Old Sadhak community
  const { oldSadhak } = await initializeSystemCommunities();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Transfer all active members to Old Sadhak
    const workshopMembers = await CommunityMembership.find({
      communityId: workshopCommunity._id.toString(),
      status: 'active',
    }).session(session);

    let membersTransferred = 0;
    for (const member of workshopMembers) {
      // Check if already in Old Sadhak
      const existingInOldSadhak = await CommunityMembership.findOne({
        communityId: oldSadhak._id.toString(),
        userId: member.userId,
      }).session(session);

      if (!existingInOldSadhak) {
        await CommunityMembership.create(
          [
            {
              communityId: oldSadhak._id.toString(),
              userId: member.userId,
              odId: member.odId,
              name: member.name,
              email: member.email,
              mobile: member.mobile,
              role: 'member',
              status: 'active',
              joinedAt: new Date(),
            },
          ],
          { session }
        );
        membersTransferred++;
      } else if (existingInOldSadhak.status !== 'active') {
        // Reactivate if they were previously in Old Sadhak
        existingInOldSadhak.status = 'active';
        await existingInOldSadhak.save({ session });
        membersTransferred++;
      }

      // Add to Community.members array
      await Community.updateOne(
        { _id: oldSadhak._id },
        { $addToSet: { members: member.userId } },
        { session }
      );
    }

    // 2. Transfer videos - keep originals but link to Old Sadhak as well
    // The videos keep their batchId for filtering, but communityId becomes Old Sadhak
    const workshopVideos = await CommunityVideo.find({
      communityId: workshopCommunity._id.toString(),
    }).session(session);

    let videosTransferred = 0;
    for (const video of workshopVideos) {
      // Update video to belong to Old Sadhak community
      // But keep workshopId and batchId for batch-wise filtering
      video.communityId = oldSadhak._id.toString();
      await video.save({ session });
      videosTransferred++;
    }

    // 3. Archive the workshop community
    workshopCommunity.isArchived = true;
    workshopCommunity.archivedAt = new Date();
    workshopCommunity.mergedIntoId = oldSadhak._id;
    await workshopCommunity.save({ session });

    // 4. Track which workshops have been merged into Old Sadhak
    await Community.updateOne(
      { _id: oldSadhak._id },
      { $addToSet: { mergedWorkshopIds: workshopObjId } },
      { session }
    );

    await session.commitTransaction();

    console.log(`✅ Merged workshop community into Old Sadhak:`);
    console.log(`   - Members transferred: ${membersTransferred}`);
    console.log(`   - Videos transferred: ${videosTransferred}`);

    return {
      success: true,
      membersTransferred,
      videosTransferred,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('Failed to merge community:', error);
    return {
      success: false,
      membersTransferred: 0,
      videosTransferred: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    session.endSession();
  }
}

/**
 * Get communities for a user
 */
export async function getUserCommunities(userId: string): Promise<{
  global: typeof Community.prototype | null;
  oldSadhak: typeof Community.prototype | null;
  activeWorkshops: Array<typeof Community.prototype>;
}> {
  await connectDB();

  // Get Global community (everyone has access)
  const global = await Community.findOne({
    type: COMMUNITY_TYPES.GLOBAL,
    isArchived: false,
  });

  // Check if user is in Old Sadhak
  const oldSadhakMembership = await CommunityMembership.findOne({
    userId,
    status: 'active',
  }).populate({
    path: 'communityId',
    match: { type: COMMUNITY_TYPES.OLD_SADHAK, isArchived: false },
  });

  let oldSadhak: any = null;
  if (oldSadhakMembership) {
    oldSadhak = await Community.findOne({
      type: COMMUNITY_TYPES.OLD_SADHAK,
      isArchived: false,
    });
    // Verify membership
    if (oldSadhak) {
      const isMember = await CommunityMembership.findOne({
        communityId: oldSadhak._id.toString(),
        userId,
        status: 'active',
      });
      if (!isMember) oldSadhak = null;
    }
  }

  // Get active workshop communities user is part of
  const activeWorkshopMemberships = await CommunityMembership.find({
    userId,
    status: 'active',
  });

  const communityIds = activeWorkshopMemberships.map((m) => m.communityId);
  const activeWorkshops = await Community.find({
    _id: { $in: communityIds },
    type: COMMUNITY_TYPES.WORKSHOP_ACTIVE,
    isArchived: false,
  });

  return { global, oldSadhak, activeWorkshops };
}

/**
 * Get recordings for a user based on their community access
 * @param userId - The user's ID
 * @param batchId - Optional: filter by specific batch
 */
export async function getUserRecordings(
  userId: string,
  options?: {
    batchId?: string;
    workshopId?: string;
    commonOnly?: boolean;
    limit?: number;
    skip?: number;
  }
): Promise<{
  common: Array<typeof CommunityVideo.prototype>;
  batchWise: Array<typeof CommunityVideo.prototype>;
  total: number;
}> {
  await connectDB();

  const { batchId, workshopId, commonOnly, limit = 50, skip = 0 } = options || {};

  // Get user's communities
  const memberships = await CommunityMembership.find({
    userId,
    status: 'active',
  });

  const communityIds = memberships.map((m) => m.communityId);

  // Base query: user must be member of the community
  const baseQuery: Record<string, unknown> = {
    communityId: { $in: communityIds },
  };

  // Get common recordings
  const commonQuery: Record<string, unknown> = { ...baseQuery, isCommon: true };
  if (workshopId) {
    commonQuery.workshopId = new mongoose.Types.ObjectId(workshopId);
  }

  const common = await CommunityVideo.find(commonQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  // Get batch-wise recordings
  let batchWise: Array<typeof CommunityVideo.prototype> = [];
  if (!commonOnly) {
    const batchQuery: Record<string, unknown> = { 
      ...baseQuery, 
      isCommon: false,
    };
    
    if (batchId) {
      batchQuery.batchId = new mongoose.Types.ObjectId(batchId);
    }
    if (workshopId) {
      batchQuery.workshopId = new mongoose.Types.ObjectId(workshopId);
    }

    batchWise = await CommunityVideo.find(batchQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  const total = await CommunityVideo.countDocuments({
    communityId: { $in: communityIds },
    ...(workshopId && { workshopId: new mongoose.Types.ObjectId(workshopId) }),
    ...(batchId && { batchId: new mongoose.Types.ObjectId(batchId) }),
  });

  return { common, batchWise, total };
}

/**
 * Get all recordings for Old Sadhak community (admin view)
 * Groups by workshop for easy navigation
 */
export async function getOldSadhakRecordings(): Promise<{
  byWorkshop: Array<{
    workshopId: string;
    workshopName: string;
    recordings: Array<typeof CommunityVideo.prototype>;
  }>;
  common: Array<typeof CommunityVideo.prototype>;
}> {
  await connectDB();

  const oldSadhak = await Community.findOne({
    type: COMMUNITY_TYPES.OLD_SADHAK,
    isArchived: false,
  });

  if (!oldSadhak) {
    return { byWorkshop: [], common: [] };
  }

  // Get common recordings
  const common = await CommunityVideo.find({
    communityId: oldSadhak._id.toString(),
    isCommon: true,
  }).sort({ createdAt: -1 });

  // Get batch-wise recordings grouped by workshop
  const recordings = await CommunityVideo.aggregate([
    {
      $match: {
        communityId: oldSadhak._id.toString(),
        isCommon: false,
        workshopId: { $exists: true },
      },
    },
    {
      $lookup: {
        from: 'workshops',
        localField: 'workshopId',
        foreignField: '_id',
        as: 'workshop',
      },
    },
    { $unwind: '$workshop' },
    {
      $group: {
        _id: '$workshopId',
        workshopName: { $first: '$workshop.name' },
        recordings: { $push: '$$ROOT' },
      },
    },
    { $sort: { 'recordings.0.createdAt': -1 } },
  ]);

  const byWorkshop = recordings.map((r) => ({
    workshopId: r._id.toString(),
    workshopName: r.workshopName,
    recordings: r.recordings,
  }));

  return { byWorkshop, common };
}

/**
 * Add a recording to a community
 */
export async function addRecordingToCommunity(
  communityId: string,
  recordingData: {
    title: string;
    description?: string;
    s3Key: string;
    duration?: number;
    thumbnailUrl?: string;
    uploadedBy: string;
    workshopId?: string;
    batchId?: string;
    isCommon?: boolean;
    source?: 'manual' | 'zoom';
    zoomMeetingId?: string;
    zoomRecordingId?: string;
    recordingType?: 'gallery_view' | 'speaker_view' | 'shared_screen' | 'other';
    tags?: string[];
  }
): Promise<typeof CommunityVideo.prototype> {
  await connectDB();

  const video = await CommunityVideo.create({
    communityId,
    title: recordingData.title,
    description: recordingData.description || '',
    s3Key: recordingData.s3Key,
    duration: recordingData.duration,
    thumbnailUrl: recordingData.thumbnailUrl,
    uploadedBy: recordingData.uploadedBy,
    workshopId: recordingData.workshopId
      ? new mongoose.Types.ObjectId(recordingData.workshopId)
      : undefined,
    batchId: recordingData.batchId
      ? new mongoose.Types.ObjectId(recordingData.batchId)
      : undefined,
    isCommon: recordingData.isCommon || false,
    source: recordingData.source || 'manual',
    zoomMeetingId: recordingData.zoomMeetingId,
    zoomRecordingId: recordingData.zoomRecordingId,
    recordingType: recordingData.recordingType || 'other',
    tags: recordingData.tags || [],
    isShareable: false,
  });

  return video;
}
