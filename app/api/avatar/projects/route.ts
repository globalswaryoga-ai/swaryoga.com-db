import { NextRequest, NextResponse } from 'next/server';
import { listAvatarProjects, saveAvatarProject } from '@/lib/bunnyAvatarRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await listAvatarProjects();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error('List avatar projects error:', error);
    return NextResponse.json({ error: error.message || 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const project = await saveAvatarProject(body);
    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Save avatar project error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save project' }, { status: 500 });
  }
}
