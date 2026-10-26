import { NextRequest, NextResponse } from 'next/server';
import {
  save3DAnimationProject,
  get3DAnimationProjects,
  delete3DAnimationProject,
  AnimationProject3D,
} from '@/lib/bunny3DAnimationRepository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const projects = await get3DAnimationProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (err: any) {
    console.error('Error fetching 3D animation projects:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'delete' && body.id) {
      const deleted = await delete3DAnimationProject(body.id);
      return NextResponse.json({ success: true, deleted });
    }

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'Project title is required' },
        { status: 400 }
      );
    }

    const saved = await save3DAnimationProject(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Error saving 3D animation project:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save project' },
      { status: 500 }
    );
  }
}
