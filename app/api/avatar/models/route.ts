import { NextResponse } from 'next/server';
import { getAllRegisteredModels } from '@/lib/avatarEngine/modelRegistry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const models = await getAllRegisteredModels();
    return NextResponse.json({
      success: true,
      total: models.length,
      commercial_ready_count: 0,
      license_review_required_count: models.length,
      models: models.map((model) => ({
        ...model,
        commercial_permitted: 0,
        install_status: 'unknown',
        health_status: 'unverified',
        evidenceStatus: 'not_verified',
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}
