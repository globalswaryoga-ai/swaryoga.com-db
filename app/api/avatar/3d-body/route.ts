import { NextRequest, NextResponse } from 'next/server';
import { getAllBodyModels, createBodyModel } from '@/lib/avatarEngine/body3dService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || undefined;
    const bodies = await getAllBodyModels(userId);
    return NextResponse.json({
      success: true,
      total: bodies.length,
      bodies,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch 3D body models' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, twinId, name, anthropometrics, rigType, meshGlbUrl, frontViewUrl } = body;

    if (!name || !anthropometrics) {
      return NextResponse.json(
        { success: false, error: 'name and anthropometrics object are required.' },
        { status: 400 }
      );
    }

    const newBody = await createBodyModel({
      userId: userId || 'admincrm',
      twinId,
      name,
      anthropometrics,
      rigType: rigType || 'blender_rigify',
      meshGlbUrl,
      frontViewUrl,
    });

    return NextResponse.json({
      success: true,
      body: newBody,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create 3D body model' },
      { status: 500 }
    );
  }
}

