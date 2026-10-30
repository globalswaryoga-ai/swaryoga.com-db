import { NextResponse } from 'next/server';
import {
  calculateTrainingCoverage,
  getOrCreateDefaultTrainingProject,
  getTrainingVideosForProject,
} from '@/lib/mohanAiClone/trainingProjectsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    const project = await getOrCreateDefaultTrainingProject();
    const targetId = projectId || project.id;
    const videos = await getTrainingVideosForProject(targetId);
    const coverage = await calculateTrainingCoverage(targetId);

    return NextResponse.json({
      success: true,
      project,
      totalUploaded: videos.length,
      videos,
      coverage,
    });
  } catch (error: any) {
    console.error('Error fetching avatar training project:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch training project' },
      { status: 500 }
    );
  }
}

