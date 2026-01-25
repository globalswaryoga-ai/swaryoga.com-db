import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';

/**
 * Knowledge Base Search API
 * Used by the chatbot to find answers based on user questions
 * No auth required - internal API for bot use
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const body = await req.json();
    const { query, category, language, limit = 3 } = body;

    if (!query?.trim()) {
      return apiError('BAD_REQUEST', 'Query is required');
    }

    const searchQuery = query.trim().toLowerCase();
    const words = searchQuery.split(/\s+/).filter((w: string) => w.length > 2);

    // Build match conditions
    const matchConditions: any[] = [
      { enabled: true }
    ];

    if (category) {
      matchConditions.push({ category });
    }

    if (language && language !== 'auto') {
      matchConditions.push({ $or: [{ language }, { language: 'auto' }] });
    }

    // 1. First try exact trigger phrase match
    const exactMatch = await KnowledgeBaseArticle.findOne({
      enabled: true,
      triggerPhrases: { $in: [searchQuery, query.trim()] },
      ...(category && { category }),
    }).lean();

    if (exactMatch) {
      // Update usage count
      await KnowledgeBaseArticle.updateOne(
        { _id: exactMatch._id },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
      );
      return apiSuccess({ 
        matches: [exactMatch], 
        matchType: 'exact',
        confidence: 1.0 
      });
    }

    // 2. Try keyword matching
    const keywordMatches = await KnowledgeBaseArticle.find({
      enabled: true,
      keywords: { $in: words },
      ...(category && { category }),
    })
      .sort({ priority: -1, usageCount: -1 })
      .limit(limit)
      .lean();

    if (keywordMatches.length > 0) {
      // Score by number of keyword matches
      const scored = keywordMatches.map((article: any) => {
        const matchCount = words.filter((w: string) => 
          article.keywords.some((k: string) => k.includes(w) || w.includes(k))
        ).length;
        return { ...article, score: matchCount / words.length };
      }).sort((a: any, b: any) => b.score - a.score);

      // Update usage for top match
      if (scored[0]) {
        await KnowledgeBaseArticle.updateOne(
          { _id: scored[0]._id },
          { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
        );
      }

      return apiSuccess({ 
        matches: scored, 
        matchType: 'keyword',
        confidence: scored[0]?.score || 0.5
      });
    }

    // 3. Try text search (MongoDB full-text)
    try {
      const textMatches = await KnowledgeBaseArticle.find({
        enabled: true,
        $text: { $search: query },
        ...(category && { category }),
      })
        .sort({ score: { $meta: 'textScore' }, priority: -1 })
        .limit(limit)
        .lean();

      if (textMatches.length > 0) {
        await KnowledgeBaseArticle.updateOne(
          { _id: textMatches[0]._id },
          { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
        );
        return apiSuccess({ 
          matches: textMatches, 
          matchType: 'text',
          confidence: 0.6
        });
      }
    } catch {
      // Text search might fail if index not created
    }

    // 4. Fuzzy match on title/content
    const fuzzyMatches = await KnowledgeBaseArticle.find({
      enabled: true,
      $or: [
        { title: { $regex: words.join('|'), $options: 'i' } },
        { content: { $regex: words.join('|'), $options: 'i' } },
      ],
      ...(category && { category }),
    })
      .sort({ priority: -1, usageCount: -1 })
      .limit(limit)
      .lean();

    if (fuzzyMatches.length > 0) {
      return apiSuccess({ 
        matches: fuzzyMatches, 
        matchType: 'fuzzy',
        confidence: 0.4
      });
    }

    // No matches found
    return apiSuccess({ 
      matches: [], 
      matchType: 'none',
      confidence: 0
    });

  } catch (err) {
    console.error('[KnowledgeBase Search]', err);
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Search failed');
  }
}
