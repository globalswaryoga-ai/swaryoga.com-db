import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { searchBunnyKnowledgeBaseArticles } from '@/lib/bunnyKnowledgeBaseRepository';

/**
 * Knowledge Base Search API
 * Used by the chatbot to find answers based on user questions
 * No auth required - internal API for bot use
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, category, language, limit = 3 } = body;

    if (!query?.trim()) {
      return apiError('BAD_REQUEST', 'Query is required');
    }

    const result = await searchBunnyKnowledgeBaseArticles(query, {
      category,
      language,
      limit: Number(limit) || 3,
    });

    return apiSuccess({
      matches: result.matches,
      matchType: result.matchType,
      confidence: result.confidence,
    });
  } catch (err) {
    console.error('[KnowledgeBase Search]', err);
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Search failed');
  }
}
