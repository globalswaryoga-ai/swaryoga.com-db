import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyAdminAccess } from '@/lib/crm-handlers';
import {
  getBunnyKnowledgeBaseArticle,
  saveBunnyKnowledgeBaseArticle,
  deleteBunnyKnowledgeBaseArticle,
} from '@/lib/bunnyKnowledgeBaseRepository';

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

    const article = await getBunnyKnowledgeBaseArticle(id);
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

    const existing = await getBunnyKnowledgeBaseArticle(id);
    if (!existing) {
      return apiError('NOT_FOUND', 'Article not found');
    }

    const body = await req.json();
    const updated = await saveBunnyKnowledgeBaseArticle(
      { ...existing, ...body },
      String(userId),
      id
    );

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

    const deletedCount = await deleteBunnyKnowledgeBaseArticle(id);
    if (!deletedCount) {
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
