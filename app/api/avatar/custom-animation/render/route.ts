import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomAnimationProjectById,
  saveCustomAnimationProject,
  CustomAnimationProject,
} from '@/lib/bunnyCustomAnimationRepository';
import { renderCustomAnimationVideo } from '@/lib/animationRenderer';
import { renderTrue3DAnimation } from '@/lib/headless3DRenderer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      resolution = '1080p',
      aspectRatio = '16:9',
      format = 'mp4',
    } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const project = await getCustomAnimationProjectById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // MANDATORY CRITICAL RULE: Invalidate / block render if not approved!
    if (project.approvalStatus !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'MANDATORY APPROVAL REQUIRED: Final rendering cannot start without Admin Approval. Please review and click "Approve & Submit" in the Approval Dashboard first.',
          approvalStatus: project.approvalStatus,
        },
        { status: 403 }
      );
    }

    // Initialize or update Render Job
    const jobId = `job_${Date.now()}`;
    const startedAt = new Date().toISOString();

    const updatedJob = {
      jobId,
      status: 'rendering' as const,
      progress: 15,
      durationSeconds: project.durationSeconds,
      resolution,
      aspectRatio,
      format,
      startedAt,
    };

    // Execute TRUE 3D WebGL Headless Chromium Rendering Pipeline!
    let renderResult = await renderTrue3DAnimation(project, {
      resolution,
      aspectRatio,
      fps: project.fps || 25,
      format,
    });

    // Fallback to FFmpeg cinematic composite pipeline if headless WebGL encounters an environment error
    if (!renderResult.success || !renderResult.videoUrl) {
      console.warn('[RenderRoute] renderTrue3DAnimation fell back to renderCustomAnimationVideo:', renderResult.error);
      renderResult = await renderCustomAnimationVideo(project, {
        resolution,
        aspectRatio,
        format,
      });
    }

    if (!renderResult.success || !renderResult.videoUrl) {
      throw new Error(renderResult.error || 'Failed to render animation video');
    }

    const outputUrl = renderResult.videoUrl;

    // Save project with real rendered output URL
    const saved = await saveCustomAnimationProject(
      {
        ...project,
        renderJob: {
          ...updatedJob,
          progress: 100,
          status: 'completed',
          outputUrl,
          completedAt: new Date().toISOString(),
        },
        renderedVideoUrl: outputUrl,
        approvalStatus: 'rendered',
      },
      true // Keep approval state during rendering
    );

    return NextResponse.json({
      success: true,
      message: 'Final rendering pipeline completed successfully with real FFmpeg encoding!',
      data: saved,
      renderJob: saved.renderJob,
      outputUrl,
      fileSize: renderResult.fileSize,
    });
  } catch (error: any) {
    console.error('Animation render pipeline error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute rendering pipeline' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const project = await getCustomAnimationProjectById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      renderJob: project.renderJob,
      renderedVideoUrl: project.renderedVideoUrl,
      approvalStatus: project.approvalStatus,
    });
  } catch (error: any) {
    console.error('Fetch render status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch render status' },
      { status: 500 }
    );
  }
}
