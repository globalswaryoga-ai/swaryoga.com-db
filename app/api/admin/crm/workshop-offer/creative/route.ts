import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { registrationViewer } from '@/lib/registrationAuth';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { listOfferDesigns, saveOfferDesign } from '@/lib/workshopOfferRepository';
import { uploadUserFile } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { prompt, language = 'English', format = 'square', media = 'image' } = await request.json();
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000 || !['image', 'video', 'copy'].includes(media) || !['square', 'portrait', 'landscape'].includes(format)) {
      return NextResponse.json({ error: 'Provide a prompt and supported media/format' }, { status: 400 });
    }
    if (media !== 'copy' && !process.env.REPLICATE_API_TOKEN) return NextResponse.json({ error: 'Image/video generation requires REPLICATE_API_TOKEN; no paid job was started.' }, { status: 503 });
    const copy = await generateAIText({
      systemPrompt: 'You are the Swar Yoga creative director. Produce accurate, concise ad copy in the requested language. Do not invent fees, schedules, medical claims, testimonials or guarantees. Return only JSON with headline, subtitle, footer, imagePrompt. imagePrompt must describe a premium photographic background in English with negative space, restrained lighting and NO lettering; localized text will be overlaid by the CRM editor.',
      message: `Language: ${String(language).slice(0, 40)}\nBrief: ${prompt}`,
      maxOutputTokens: 650, temperature: 0.5,
    });
    const result = JSON.parse(copy.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
    if (['headline', 'subtitle', 'footer', 'imagePrompt'].some(key => typeof result[key] !== 'string')) throw new Error('AI returned incomplete creative fields');
    const size = format === 'portrait' ? [1024, 1792] : format === 'landscape' ? [1792, 1024] : [1024, 1024];
    const id = crypto.randomUUID();
    const design = { id, kind: 'ad', title: prompt.slice(0, 80), headline: result.headline, subtitle: result.subtitle, footer: result.footer, accent: '#c8a35e', background: '#152b2a', textColor: '#ffffff', fontFamily: 'sans', width: size[0], height: size[1], status: 'draft' };
    if (media === 'copy') {
      await saveOfferDesign(viewer.superAdmin ? 'shared' : viewer.userId, id, 'ad', design);
      return NextResponse.json({ data: design });
    }
    const model = media === 'video' ? 'minimax/video-01' : 'black-forest-labs/flux-1.1-pro';
    const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: media === 'video' ? { prompt: result.imagePrompt } : { prompt: result.imagePrompt, width: format === 'portrait' ? 768 : format === 'landscape' ? 1344 : 1024, height: format === 'portrait' ? 1344 : format === 'landscape' ? 768 : 1024, output_format: 'png' } }),
      signal: AbortSignal.timeout(30000),
    });
    const prediction = await response.json();
    if (!response.ok || !prediction.id) throw new Error(prediction.detail || `Creative provider failed (${response.status})`);
    const job = { ...design, predictionId: prediction.id, generationStatus: prediction.status, media };
    await saveOfferDesign(viewer.superAdmin ? 'shared' : viewer.userId, id, 'ad', job);
    return NextResponse.json({ data: job }, { status: 202 });
  } catch (error) {
    console.error('[offer creative]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI generation could not start' }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const id = new URL(request.url).searchParams.get('id');
    const job = (await listOfferDesigns(scope)).find(row => row.id === id);
    if (!job?.predictionId) return NextResponse.json({ error: 'Creative job not found' }, { status: 404 });
    if (['succeeded', 'failed', 'canceled'].includes(job.generationStatus)) return NextResponse.json({ data: job });
    const response = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(job.predictionId)}`, { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Creative job check failed (${response.status})`);
    const prediction = await response.json();
    job.generationStatus = prediction.status;
    if (prediction.status === 'failed' || prediction.status === 'canceled') job.generationError = String(prediction.error || 'Generation canceled');
    if (prediction.status === 'succeeded') {
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('Creative provider returned no downloadable media');
      const media = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!media.ok) throw new Error('Generated media download failed');
      const bytes = Buffer.from(await media.arrayBuffer());
      if (bytes.length > 80_000_000) throw new Error('Generated media exceeds the CRM upload limit');
      const video = job.media === 'video';
      const artifact = await uploadUserFile(bytes, `${job.id}.${video ? 'mp4' : 'png'}`, viewer.userId, 'offer-designs', video ? 'video/mp4' : 'image/png');
      job[video ? 'videoUrl' : 'imageUrl'] = artifact.url;
    }
    const current = (await listOfferDesigns(scope)).find(row => row.id === id);
    if (current?.status === 'final') return NextResponse.json({ error: 'This creative was finalized before generation completed. Start a separate creative for new media.' }, { status: 409 });
    const merged = { ...current, predictionId: job.predictionId, media: job.media, generationStatus: job.generationStatus, generationError: job.generationError,
      ...(job.imageUrl ? { imageUrl: job.imageUrl } : {}), ...(job.videoUrl ? { videoUrl: job.videoUrl } : {}) };
    await saveOfferDesign(scope, job.id, 'ad', merged);
    return NextResponse.json({ data: merged });
  } catch (error) {
    console.error('[offer creative status]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Creative job unavailable' }, { status: 502 });
  }
}
