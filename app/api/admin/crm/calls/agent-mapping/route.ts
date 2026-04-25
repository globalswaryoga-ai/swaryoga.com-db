/**
 * Agent Language Mapping API
 * GET    - List all language-to-agent mappings
 * POST   - Create or update a mapping
 * DELETE - Remove a mapping
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAgentLanguageMapping } from '@/lib/schemas/enterpriseSchemas';
import { resolveAgentForLanguage } from '@/lib/retellAI';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/calls/agent-mapping
 * List all mappings or resolve a single language
 * Query: ?resolve=hi  → returns resolved agent for that language
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    await connectDB();

    const resolve = request.nextUrl.searchParams.get('resolve');
    if (resolve) {
      const result = await resolveAgentForLanguage(resolve);
      return apiSuccess({ resolved: result, language: resolve });
    }

    const AgentLanguageMapping = getAgentLanguageMapping();
    const mappings = await AgentLanguageMapping.find(tf).sort({ language: 1 }).lean();
    return apiSuccess({ mappings });
  } catch (err: any) {
    console.error('[agent-mapping GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/calls/agent-mapping
 * Create or update a language mapping
 * Body: { language, agentId, agentName?, voiceId?, isDefault?, isActive? }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    const body = await request.json();
    const { language, agentId, agentName, voiceId, isDefault, isActive } = body;

    if (!language?.trim()) return apiError('VALIDATION_ERROR', 'language is required');
    if (!agentId?.trim()) return apiError('VALIDATION_ERROR', 'agentId is required');

    await connectDB();
    const AgentLanguageMapping = getAgentLanguageMapping();

    const normalizedLang = language.toLowerCase().trim();

    // If setting as default, clear other defaults
    if (isDefault) {
      await AgentLanguageMapping.updateMany({ isDefault: true, ...tf }, { $set: { isDefault: false } });
    }

    // Upsert: update if language exists, insert if not
    const result = await AgentLanguageMapping.findOneAndUpdate(
      { language: normalizedLang, ...tf },
      {
        $set: {
          language: normalizedLang,
          agentId: agentId.trim(),
          agentName: agentName || '',
          voiceId: voiceId || '',
          isDefault: isDefault || false,
          isActive: isActive !== false,
          updatedBy: decoded.userId || decoded.email || 'admin',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return apiSuccess({
      mapping: result,
      message: `Language "${normalizedLang}" mapped to agent "${agentName || agentId}"`,
    });
  } catch (err: any) {
    console.error('[agent-mapping POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * DELETE /api/admin/crm/calls/agent-mapping
 * Remove a mapping by language or _id
 * Query: ?language=ne  OR  ?id=abc123
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    await connectDB();
    const AgentLanguageMapping = getAgentLanguageMapping();

    const language = request.nextUrl.searchParams.get('language');
    const id = request.nextUrl.searchParams.get('id');

    if (!language && !id) return apiError('VALIDATION_ERROR', 'language or id is required');

    const query = id ? { _id: id } : { language: language!.toLowerCase() };
    const deleted = await AgentLanguageMapping.findOneAndDelete({ ...query, ...tf });

    if (!deleted) return apiError('NOT_FOUND', 'Mapping not found');

    return apiSuccess({ deleted: true, language: (deleted as any).language });
  } catch (err: any) {
    console.error('[agent-mapping DELETE]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
