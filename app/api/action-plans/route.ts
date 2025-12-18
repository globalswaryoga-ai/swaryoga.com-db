import { NextRequest, NextResponse } from 'next/server';
import { ActionPlan } from '@/lib/types/lifePlanner';

// In-memory storage for demo (replace with MongoDB for production)
let actionPlansData: ActionPlan[] = [];

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action') || 'get-all';

    switch (action) {
      case 'get-all':
        return NextResponse.json({
          success: true,
          data: actionPlansData,
          count: actionPlansData.length,
        });

      case 'get-by-vision':
        const visionId = request.nextUrl.searchParams.get('visionId');
        if (!visionId) {
          return NextResponse.json(
            { success: false, message: 'visionId parameter required' },
            { status: 400 }
          );
        }
        const filtered = actionPlansData.filter(plan => plan.visionId === visionId);
        return NextResponse.json({
          success: true,
          data: filtered,
          count: filtered.length,
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Action Plans API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, plan } = body;

    switch (action) {
      case 'save':
        if (!plan || !plan.id) {
          return NextResponse.json(
            { success: false, message: 'Invalid plan data' },
            { status: 400 }
          );
        }

        // Check if updating existing or adding new
        const existingIndex = actionPlansData.findIndex(p => p.id === plan.id);
        if (existingIndex >= 0) {
          actionPlansData[existingIndex] = plan;
        } else {
          actionPlansData.push(plan);
        }

        return NextResponse.json({
          success: true,
          message: 'Action plan saved successfully',
          plan,
        });

      case 'delete':
        const { id } = body;
        if (!id) {
          return NextResponse.json(
            { success: false, message: 'Plan ID required' },
            { status: 400 }
          );
        }
        actionPlansData = actionPlansData.filter(p => p.id !== id);
        return NextResponse.json({
          success: true,
          message: 'Action plan deleted successfully',
        });

      case 'sync':
        // Sync all action plans to MongoDB (implementation depends on your DB setup)
        const timestamp = new Date().toISOString();
        return NextResponse.json({
          success: true,
          message: 'Action plans synced',
          syncedAt: timestamp,
          count: actionPlansData.length,
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Action Plans API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
