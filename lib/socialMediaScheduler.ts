/**
 * Social Media Post Scheduler
 * 
 * Checks for scheduled posts that are ready to publish and publishes them automatically
 * Runs every minute to ensure timely publishing
 */

import mongoose from 'mongoose';
import { connectDB, SocialMediaPost } from './db';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

export interface ScheduledPostCheckResult {
  totalChecked: number;
  published: number;
  failed: number;
  errors: Array<{ postId: string; error: string }>;
}

/**
 * Check for scheduled posts that are ready to publish
 * This function should be called periodically (e.g., every minute via cron job)
 */
export async function checkAndPublishScheduledPosts(): Promise<ScheduledPostCheckResult> {
  const result: ScheduledPostCheckResult = {
    totalChecked: 0,
    published: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    const now = new Date();

    // Find all posts that are scheduled for publishing and not yet published
    const postsToPublish = await SocialMediaPost.find({
      status: { $in: ['draft', 'scheduled'] },
      scheduledFor: { $lte: now },
      $or: [
        { publishAttempts: { $lt: MAX_RETRIES } },
        { publishAttempts: { $exists: false } },
      ],
    });

    result.totalChecked = postsToPublish.length;

    // Publish each post
    for (const post of postsToPublish) {
      try {
        const postId = post._id.toString();

        // Publish to platforms
        const publishResult = await publishPostToPlatforms(post);

        if (publishResult.success) {
          // Update post as published
          await SocialMediaPost.updateOne(
            { _id: post._id },
            {
              $set: {
                status: 'published',
                publishedAt: now,
                updatedAt: now,
              },
              $inc: { publishAttempts: 1 },
            }
          );
          result.published++;
        } else {
          // Mark attempt and potentially retry
          const attempts = (post.publishAttempts || 0) + 1;

          if (attempts >= MAX_RETRIES) {
            await SocialMediaPost.updateOne(
              { _id: post._id },
              {
                $set: {
                  status: 'failed',
                  failureReason: publishResult.error,
                  updatedAt: now,
                },
                $inc: { publishAttempts: 1 },
              }
            );
            result.failed++;
            result.errors.push({ postId, error: publishResult.error || 'Unknown error' });
          } else {
            // Increment attempts for retry
            await SocialMediaPost.updateOne(
              { _id: post._id },
              {
                $inc: { publishAttempts: 1 },
                $set: { updatedAt: now },
              }
            );
            result.errors.push({ 
              postId, 
              error: `${publishResult.error} (retry ${attempts}/${MAX_RETRIES})` 
            });
          }
        }
      } catch (error) {
        const postId = post._id.toString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failed++;
        result.errors.push({ postId, error: errorMessage });
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in checkAndPublishScheduledPosts:', errorMessage);
    throw error;
  }
}

/**
 * Publish a single post to its configured platforms
 */
async function publishPostToPlatforms(post: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate post has required fields
    if (!post._id) {
      return { success: false, error: 'Post missing _id' };
    }

    if (!Array.isArray(post.platforms) || post.platforms.length === 0) {
      return { success: false, error: 'Post has no platforms selected' };
    }

    if (!Array.isArray(post.accountIds) || post.accountIds.length === 0) {
      return { success: false, error: 'Post has no accounts selected' };
    }

    // Call the publish API endpoint internally
    // We'll make an authenticated request to the publish endpoint
    const token = process.env.INTERNAL_API_TOKEN || 'internal-scheduler';

    const response = await fetch(
      `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/social-media/posts/${post._id}/publish`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result?.error || `HTTP ${response.status}`,
      };
    }

    if (result?.data?.status === 'published' || result?.success === true) {
      return { success: true };
    }

    // Check if all platforms failed
    const results = result?.data?.results || [];
    const allFailed = results.length > 0 && results.every((r: any) => !r.ok);

    if (allFailed) {
      const errors = results
        .filter((r: any) => !r.ok)
        .map((r: any) => `${r.platform}: ${r.error}`)
        .join('; ');
      return { success: false, error: errors };
    }

    // Partial success is still success for the scheduler
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get scheduler status and metrics
 */
export async function getSchedulerStatus() {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    const now = new Date();
    const scheduled = await SocialMediaPost.countDocuments({
      status: { $in: ['draft', 'scheduled'] },
      scheduledFor: { $exists: true },
    });

    const readyToPublish = await SocialMediaPost.countDocuments({
      status: { $in: ['draft', 'scheduled'] },
      scheduledFor: { $lte: now },
    });

    const published = await SocialMediaPost.countDocuments({
      status: 'published',
    });

    const failed = await SocialMediaPost.countDocuments({
      status: 'failed',
    });

    return {
      status: 'active',
      scheduledPosts: scheduled,
      readyToPublish,
      publishedPosts: published,
      failedPosts: failed,
      nextCheckAt: new Date(Date.now() + 60000), // Next minute
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
