import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema, createModerationItem } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

// POST - Create a new submission
export async function POST(req: NextRequest) {
  try {
    await initCommunitySchema();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('AUTHENTICATION_FAILED', 'Invalid token');
    }

    const body = await req.json();
    const {
      category,
      participantName,
      workshopName,
      batchName,
      imageUrl,
      experienceDetails,
      problemHeading,
      problemDescription,
      tipsDetails,
      beforeStory,
      afterStory,
      question,
    } = body;

    // Validation
    if (!category || !['experiences', 'tips', 'transformations', 'questions'].includes(category)) {
      return apiError('VALIDATION_ERROR', 'Invalid category');
    }

    if (!participantName?.trim()) {
      return apiError('VALIDATION_ERROR', 'Participant name is required');
    }

    let type = 'experience';
    let content = '';
    if (category === 'experiences') {
      type = 'experience';
      content = experienceDetails?.trim() || '';
    } else if (category === 'tips') {
      type = 'tip';
      content = (problemHeading || '') + '\n\n' + (problemDescription || tipsDetails || '');
    } else if (category === 'transformations') {
      type = 'transformation';
      content = (beforeStory || '') + '\n\n' + (afterStory || '');
    } else if (category === 'questions') {
      type = 'question';
      content = question?.trim() || '';
    }

    if (!content.trim()) {
      return apiError('VALIDATION_ERROR', 'Content is required');
    }

    const item = await createModerationItem({
      type,
      userId: String(decoded.userId),
      userName: participantName.trim(),
      userEmail: decoded.email || '',
      content: content.trim(),
      photoUrl: imageUrl?.trim() || null,
      status: 'pending',
    });

    return apiSuccess({ 
      message: 'Submission received successfully',
      submissionId: item.id,
    });
  } catch (error) {
    console.error('Community submission error:', error);
    return apiError('SERVER_ERROR', 'Failed to submit');
  }
}

// GET - Get user's submissions (for their own history)
export async function GET(req: NextRequest) {
  try {
    await initCommunitySchema();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('AUTHENTICATION_FAILED', 'Invalid token');
    }

    const res = await bunnyExecute({
      sql: 'SELECT * FROM community_moderation_sql WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      args: [String(decoded.userId)],
    });

    const submissions = res.rows.map((r: any) => ({
      _id: r.id,
      id: r.id,
      category: r.type === 'experience' ? 'experiences' : r.type === 'tip' ? 'tips' : r.type === 'transformation' ? 'transformations' : 'questions',
      participantName: r.user_name,
      status: r.status,
      content: r.content,
      createdAt: r.created_at,
    }));

    return apiSuccess({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch submissions');
  }
}
