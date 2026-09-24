/**
 * Funnel Configuration API
 * GET  - Fetch active funnel config (or create default)
 * PUT  - Update funnel stages (rename, reorder, colors)
 */
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getBunnyFunnelConfig, createBunnyFunnelConfig, updateBunnyFunnelConfig } from '@/lib/bunnyFunnelRepository';

export const dynamic = 'force-dynamic';

// Default 11-step funnel with 4K vibrant colors
const DEFAULT_STAGES = [
  { key: 'new_lead',       name: 'New Lead',       color: '#6366F1', colorGradient: '#818CF8', order: 0,  icon: 'sparkles',      isDefault: true,  description: 'Fresh lead just entered the funnel' },
  { key: 'contacted',      name: 'Contacted',      color: '#3B82F6', colorGradient: '#60A5FA', order: 1,  icon: 'phone',         isDefault: false, description: 'Initial contact made via call/message' },
  { key: 'interested',     name: 'Interested',     color: '#06B6D4', colorGradient: '#22D3EE', order: 2,  icon: 'heart',         isDefault: false, description: 'Lead showed interest in programs' },
  { key: 'demo_trial',     name: 'Demo / Trial',   color: '#8B5CF6', colorGradient: '#A78BFA', order: 3,  icon: 'play',          isDefault: false, description: 'Attending demo or trial session' },
  { key: 'negotiation',    name: 'Negotiation',    color: '#F59E0B', colorGradient: '#FBBF24', order: 4,  icon: 'handshake',     isDefault: false, description: 'Discussing pricing and enrollment' },
  { key: 'enrolled',       name: 'Enrolled',       color: '#10B981', colorGradient: '#34D399', order: 5,  icon: 'check-circle',  isDefault: false, description: 'Payment done, enrolled in workshop' },
  { key: 'completed',      name: 'Completed',      color: '#EC4899', colorGradient: '#F472B6', order: 6,  icon: 'trophy',        isDefault: false, description: 'Program completed successfully' },
  { key: 'inactive',       name: 'Inactive',       color: '#6B7280', colorGradient: '#9CA3AF', order: 7,  icon: 'pause-circle',  isDefault: false, description: 'Lead is currently inactive or unresponsive' },
  { key: 'repeater',       name: 'Repeater',       color: '#F97316', colorGradient: '#FB923C', order: 8,  icon: 'repeat',        isDefault: false, description: 'Returning student, repeat enrollment' },
  { key: 'old_sadhak',     name: 'Old Sadhak',     color: '#14B8A6', colorGradient: '#2DD4BF', order: 9,  icon: 'lotus',         isDefault: false, description: 'Long-time practitioner / experienced sadhak' },
  { key: 'only_for_post',  name: 'Only for Post',  color: '#A855F7', colorGradient: '#C084FC', order: 10, icon: 'megaphone',     isDefault: false, description: 'Lead used only for social media posting' },
];

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded);

    let config = await getBunnyFunnelConfig(viewerUserId, superAdmin);

    // Auto-create default config if none exists
    if (!config) {
      config = await createBunnyFunnelConfig({
        name: 'Default Funnel',
        isActive: true,
        createdByUserId: decoded.userId || decoded.username,
        stages: DEFAULT_STAGES,
      });
    }

    return apiSuccess(config);
  } catch (err: any) {
    console.error('[Funnel Config GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    if (!isSuperAdmin(decoded)) return apiError('FORBIDDEN', 'Only super admin can edit funnel config');

    const viewerUserId = getViewerUserId(decoded);
    const body = await request.json();

    const { stages, name } = body;
    if (!stages || !Array.isArray(stages) || stages.length < 2) {
      return apiError('VALIDATION_ERROR', 'At least 2 funnel stages are required');
    }

    // Validate each stage
    for (const s of stages) {
      if (!s.key || !s.name) {
        return apiError('VALIDATION_ERROR', 'Each stage must have a key and name');
      }
    }

    // Ensure order is correct
    const orderedStages = stages.map((s: any, i: number) => ({ ...s, order: i }));

    let config = await getBunnyFunnelConfig(viewerUserId, true);
    if (!config) {
      config = await createBunnyFunnelConfig({
        name: name || 'Default Funnel',
        isActive: true,
        createdByUserId: decoded.userId || decoded.username,
        stages: orderedStages,
      });
    } else {
      config = await updateBunnyFunnelConfig(config._id, {
        stages: orderedStages,
        ...(name ? { name } : {})
      });
    }

    return apiSuccess(config);
  } catch (err: any) {
    console.error('[Funnel Config PUT]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
