import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyAdminAccess, isSuperAdmin, getViewerUserId, handleCrmError } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List all knowledge base articles
export async function GET(req: NextRequest) {
  try {
    const userId = verifyAdminAccess(req);
    if (!userId) return apiError('UNAUTHORIZED');

    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const enabled = url.searchParams.get('enabled');
    const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);
    const skip = Number(url.searchParams.get('skip') || 0);

    const query: any = {};

    // Non-superadmins only see their own articles
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!isSuperAdmin(decoded)) {
      query.createdByUserId = userId;
    }

    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (enabled === 'true') {
      query.enabled = true;
    } else if (enabled === 'false') {
      query.enabled = false;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const [articles, total] = await Promise.all([
      KnowledgeBaseArticle.find(query)
        .sort({ priority: -1, usageCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      KnowledgeBaseArticle.countDocuments(query),
    ]);

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

    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const body = await req.json();
    const { title, content, shortAnswer, category, subcategory, keywords, triggerPhrases, language, priority, enabled } = body;

    if (!title?.trim()) {
      return apiError('BAD_REQUEST', 'Title is required');
    }
    if (!content?.trim()) {
      return apiError('BAD_REQUEST', 'Content is required');
    }

    const article = await KnowledgeBaseArticle.create({
      title: title.trim(),
      content: content.trim(),
      shortAnswer: shortAnswer?.trim() || null,
      category: category || 'general',
      subcategory: subcategory?.trim() || null,
      keywords: Array.isArray(keywords) ? keywords.map((k: string) => k.trim().toLowerCase()).filter(Boolean) : [],
      triggerPhrases: Array.isArray(triggerPhrases) ? triggerPhrases.filter(Boolean) : [],
      language: language || 'auto',
      priority: Number(priority) || 0,
      enabled: enabled !== false,
      createdByUserId: userId,
    });

    return apiSuccess(article.toObject());
  } catch (err) {
    console.error('[KnowledgeBase POST]', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('UNAUTHORIZED');
    }
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Failed to create article');
  }
}
