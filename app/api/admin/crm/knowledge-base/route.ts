import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyAdminAccess, isSuperAdmin } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import {
  listBunnyKnowledgeBaseArticles,
  saveBunnyKnowledgeBaseArticle,
} from '@/lib/bunnyKnowledgeBaseRepository';

export const dynamic = 'force-dynamic';

// GET - List all knowledge base articles
export async function GET(req: NextRequest) {
  try {
    const userId = verifyAdminAccess(req);
    if (!userId) return apiError('UNAUTHORIZED');

    const url = new URL(req.url);
    const category = url.searchParams.get('category') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const enabledParam = url.searchParams.get('enabled');
    const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);
    const skip = Number(url.searchParams.get('skip') || 0);

    let enabled: boolean | undefined = undefined;
    if (enabledParam === 'true') enabled = true;
    else if (enabledParam === 'false') enabled = false;

    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    const ownerId = isSuperAdmin(decoded) ? undefined : String(userId);

    const { articles, total } = await listBunnyKnowledgeBaseArticles(ownerId, {
      category,
      search,
      enabled,
      limit,
      skip,
    });

    return apiSuccess({ articles, total, limit, skip });
  } catch (err) {
    console.error('[KnowledgeBase GET]', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('UNAUTHORIZED');
    }
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Failed to fetch articles');
  }
}

// POST - Create new knowledge base article
export async function POST(req: NextRequest) {
  try {
    const userId = verifyAdminAccess(req);
    if (!userId) return apiError('UNAUTHORIZED');

    const body = await req.json();
    const { title, content, shortAnswer, category, subcategory, keywords, triggerPhrases, language, priority, enabled } = body;

    if (!title?.trim()) {
      return apiError('BAD_REQUEST', 'Title is required');
    }
    if (!content?.trim()) {
      return apiError('BAD_REQUEST', 'Content is required');
    }

    const article = await saveBunnyKnowledgeBaseArticle(
      {
        title: title.trim(),
        content: content.trim(),
        shortAnswer: shortAnswer?.trim() || null,
        category: category || 'general',
        subcategory: subcategory?.trim() || null,
        keywords: Array.isArray(keywords) ? keywords : [],
        triggerPhrases: Array.isArray(triggerPhrases) ? triggerPhrases : [],
        language: language || 'auto',
        priority: Number(priority) || 0,
        enabled: enabled !== false,
      },
      String(userId)
    );

    return apiSuccess(article);
  } catch (err) {
    console.error('[KnowledgeBase POST]', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('UNAUTHORIZED');
    }
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Failed to create article');
  }
}
