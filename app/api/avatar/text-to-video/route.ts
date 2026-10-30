import { NextResponse } from 'next/server';
import {
  generateSrtSubtitles,
  generateVttSubtitles,
  getGeneratedVideoProjectById,
  getGeneratedVideoProjects,
  saveGeneratedVideoProject,
  segmentScriptIntoTimeline,
} from '@/lib/mohanAiClone/textToVideoRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const project = await getGeneratedVideoProjectById(id);
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      return NextResponse.json({ success: true, project });
    }

    const projects = await getGeneratedVideoProjects();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'save', script_text, language = 'hi', segments } = body;

    if (action === 'segment') {
      if (!script_text) return NextResponse.json({ success: false, error: 'script_text is required' }, { status: 400 });
      const generatedSegments = segmentScriptIntoTimeline(script_text, language);
      return NextResponse.json({ success: true, segments: generatedSegments });
    }

    if (action === 'export_subtitles') {
      if (!segments || !Array.isArray(segments)) {
        return NextResponse.json({ success: false, error: 'segments array is required' }, { status: 400 });
      }
      const srt = generateSrtSubtitles(segments);
      const vtt = generateVttSubtitles(segments);
      return NextResponse.json({ success: true, srt, vtt });
    }

    // Default: Save Project
    const saved = await saveGeneratedVideoProject(body);
    return NextResponse.json({ success: true, project: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

