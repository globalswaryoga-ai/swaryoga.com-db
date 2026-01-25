import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyAdminAccess, handleCrmError } from '@/lib/crm-handlers';

// GET - Get single article by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = verifyAdminAccess(req);
    if (!userId) return apiError('UNAUTHORIZED');

    const { id } = await params;
    if (!id) return apiError('BAD_REQUEST', 'Article ID is required');

    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const article = await KnowledgeBaseArticle.findById(id).lean();
    if (!article) {
      return apiError('NOT_FOUND', 'Article not found');
    }

    return apiSuccess(article);
  } catch (err) {
    console.error('[KnowledgeBase GET/:id]', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('UNAUTHORIZED');
    }
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Failed to fetch article');
  }
}

// PUT - Update article
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = verifyAdminAccess(req);
    if (!userId) return apiError('UNAUTHORIZED');

    const { id } = await params;
    if (!id) return apiError('BAD_REQUEST', 'Article ID is required');

    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const body = await req.json();
    const updates: any = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.content !== undefined) updates.content = body.content.trim();
    if (body.shortAnswer !== undefined) updates.shortAnswer = body.shortAnswer?.trim() || null;
    if (body.category !== undefined) updates.category = body.category;
    if (body.subcategory !== undefined) updates.subcategory = body.subcategory?.trim() || null;
    if (body.keywords !== undefined) {
      updates.keywords = Array.isArray(body.keywords) 
        ? body.keywords.map((k: string) => k.trim().toLowerCase()).filter(Boolean) 
        : [];
    }
    if (body.triggerPhrases !== undefined) {
      updates.triggerPhrases = Array.isArray(body.triggerPhrases) ? body.triggerPhrases.filter(Boolean) : [];
    }
    if (body.language !== undefined) updates.language = body.language;
    if (body.priority !== undefined) updates.priority = Number(body.priority) || 0;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    const updated = await KnowledgeBaseArticle.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return apiError('NOT_FOUND', 'Article not found');
    }

    return apiSuccess(updated);
  } catch (err) {
    console.error('[KnowledgeBase PUT/:id]', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('UNAUTHORIZED');
    }
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Failed to update article');
  }
}

// DELETE - Delete article
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = verifyAdminAccess(req);
    if (!userId) return apiError('UNAUTHORIZED');

    const { id } = await params;
    if (!id) return apiError('BAD_REQUEST', 'Article ID is required');

    await connectDB();
    const { getKnowledgeBaseArticle } = await import('@/lib/schemas/enterpriseSchemas');
    const KnowledgeBaseArticle = getKnowledgeBaseArticle();

    const deleted = await KnowledgeBaseArticle.findByIdAndDelete(id);
    if (!deleted) {
      return apiError('NOT_FOUND', 'Article not found');
    }

    return apiSuccess({ deleted: true, id });
  } catch (err) {
    console.error('[KnowledgeBase DELETE/:id]', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('UNAUTHORIZED');
    }
    return apiError('SERVER_ERROR', err instanceof Error ? err.message : 'Failed to delete article');
  }
}
