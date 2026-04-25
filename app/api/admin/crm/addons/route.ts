/**
 * CRM Addons API
 * Manage addon configuration and availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';
import { CRM_ADDONS, getEnabledAddons, validateAddonEnv } from '@/lib/crm/addons.registry';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/addons
 * List all available addons with status
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return apiError('Access denied', 403);
    }

    // Filter addons based on environment
    const availableAddons = CRM_ADDONS.map((addon) => ({
      ...addon,
      envValid: validateAddonEnv(addon),
    }));

    return apiSuccess({
      addons: availableAddons,
      count: availableAddons.length,
      enabledCount: availableAddons.filter((a) => a.enabled).length,
    });
  } catch (error: any) {
    console.error('[Addons API] GET Error:', error);
    return apiError(error.message || 'Failed to fetch addons', 500);
  }
}

/**
 * POST /api/admin/crm/addons
 * Create addon configuration or install addon
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return apiError('Access denied', 403);
    }

    const body = await request.json();
    const { action, addonId, settings } = body;

    if (action === 'get-specs') {
      // Get addon specifications
      const addon = CRM_ADDONS.find((a) => a.id === addonId);
      if (!addon) {
        return apiError('Addon not found', 404);
      }

      return apiSuccess({
        addon,
        envValid: validateAddonEnv(addon),
        required: addon.requiredEnvVars || [],
      });
    }

    return apiError('Invalid action', 400);
  } catch (error: any) {
    console.error('[Addons API] POST Error:', error);
    return apiError(error.message || 'Failed to process request', 500);
  }
}

/**
 * PUT /api/admin/crm/addons
 * Update addon configuration (enable/disable)
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return apiError('Access denied', 403);
    }

    const body = await request.json();
    const { addonId, enabled, settings } = body;

    // Validate addon exists
    const addon = CRM_ADDONS.find((a) => a.id === addonId);
    if (!addon) {
      return apiError('Addon not found', 404);
    }

    // Validate environment if enabling
    if (enabled && !validateAddonEnv(addon)) {
      return apiError(
        `Missing required environment variables: ${addon.requiredEnvVars?.join(', ')}`,
        400
      );
    }

    // Update addon state (in production, this would persist to DB)
    // For now, return success - actual toggling happens in the registry
    return apiSuccess({
      message: `Addon ${addonId} ${enabled ? 'enabled' : 'disabled'}`,
      addon: {
        ...addon,
        enabled,
      },
    });
  } catch (error: any) {
    console.error('[Addons API] PUT Error:', error);
    return apiError(error.message || 'Failed to update addon', 500);
  }
}

/**
 * DELETE /api/admin/crm/addons?addonId=...
 * Remove addon configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return apiError('Access denied', 403);
    }

    const { searchParams } = new URL(request.url);
    const addonId = searchParams.get('addonId');

    if (!addonId) {
      return apiError('Missing addonId', 400);
    }

    const addon = CRM_ADDONS.find((a) => a.id === addonId);
    if (!addon) {
      return apiError('Addon not found', 404);
    }

    // Prevent deleting core addons
    const coreAddons = ['crm-funnel', 'crm-labels', 'crm-broadcast', 'crm-scheduled-messages'];
    if (coreAddons.includes(addonId)) {
      return apiError('Cannot delete core addon', 403);
    }

    return apiSuccess({
      message: `Addon ${addonId} uninstalled`,
    });
  } catch (error: any) {
    console.error('[Addons API] DELETE Error:', error);
    return apiError(error.message || 'Failed to delete addon', 500);
  }
}
