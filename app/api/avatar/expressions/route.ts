import { NextRequest, NextResponse } from 'next/server';
import { getAllExpressions, saveCustomExpression } from '@/lib/avatarEngine/expressionService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const expressions = await getAllExpressions();
    return NextResponse.json({
      success: true,
      total: expressions.length,
      expressions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expressions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      expressionName,
      emotionCategory,
      intensity,
      blendshapes,
      headPitch,
      headYaw,
      headRoll,
      eyeSquint,
      mouthSmile,
      previewImageUrl,
    } = body;

    if (!expressionName || !blendshapes) {
      return NextResponse.json(
        { success: false, error: 'expressionName and blendshapes are required.' },
        { status: 400 }
      );
    }

    const id = `expr_${Date.now()}`;
    const saved = await saveCustomExpression({
      id,
      expressionName,
      emotionCategory: emotionCategory || 'custom',
      intensity: intensity || 1.0,
      blendshapes,
      headPitch: headPitch || 0.0,
      headYaw: headYaw || 0.0,
      headRoll: headRoll || 0.0,
      eyeSquint: eyeSquint || 0.0,
      mouthSmile: mouthSmile || 0.0,
      previewImageUrl,
    });

    return NextResponse.json({
      success: true,
      expression: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save expression' },
      { status: 500 }
    );
  }
}
