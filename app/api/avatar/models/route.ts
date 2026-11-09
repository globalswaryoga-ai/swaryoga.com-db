import { NextResponse } from 'next/server';
import { getAllRegisteredModels } from '@/lib/avatarEngine/modelRegistry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const models = await getAllRegisteredModels();
    return NextResponse.json({
      success: true,
      total: models.length,
      commercial_ready_count: models.filter(m => m.commercial_permitted === 1).length,
      models,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

