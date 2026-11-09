import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await bunnyExecute('SELECT 1 AS ok');
    const models = [
      {
        id: 'liveportrait',
        name: 'LivePortrait',
        category: 'expression_motion',
        status: 'not_verified',
        isOperational: false,
        licenseStatus: 'not_verified',
        evidence: 'No pinned checkpoint, installed weights, or successful inference run is recorded here.',
      },
      {
        id: 'wav2lip_gfpgan',
        name: 'Wav2Lip / GFPGAN',
        category: 'lip_sync_and_restoration',
        status: 'not_verified',
        isOperational: false,
        licenseStatus: 'review_required',
        evidence: 'No pinned checkpoint or successful inference run is recorded; do not assume commercial rights.',
      },
      {
        id: 'indic_f5_tts',
        name: 'F5-TTS',
        category: 'voice_cloning',
        status: 'not_verified',
        isOperational: false,
        licenseStatus: 'checkpoint_review_required',
        evidence: 'No local inference/checkpoint is verified. The reviewed checkpoint terms are non-commercial.',
      },
      {
        id: 'edge_tts_draft',
        name: 'Edge TTS',
        category: 'speech_preparation',
        status: 'integrated_unverified',
        isOperational: false,
        licenseStatus: 'provider_terms_review_required',
        evidence: 'A speech-preparation integration exists; this is not a voice clone and live availability is not asserted.',
      },
    ];

    const inferenceConfigured = Boolean(
      process.env.AVATAR_INFERENCE_URL &&
      process.env.AVATAR_INFERENCE_TOKEN &&
      process.env.AVATAR_WORKER_TOKEN
    );
    const gpuBridge = {
      status: inferenceConfigured ? 'configured_not_verified' : 'not_configured',
      inferenceEndpointConfigured: Boolean(process.env.AVATAR_INFERENCE_URL),
      workerAuthenticationConfigured: Boolean(process.env.AVATAR_WORKER_TOKEN),
      inferenceAuthenticationConfigured: Boolean(process.env.AVATAR_INFERENCE_TOKEN),
      note: 'Configuration presence does not verify a reachable GPU, installed weights, or successful inference.',
    };

    const storageCdn = {
      configured: Boolean(process.env.BUNNY_STORAGE_CDN_HOST),
      cdnHost: process.env.BUNNY_STORAGE_CDN_HOST || null,
      status: 'configuration_only',
      note: 'No upload/read-back check is performed by this status endpoint.',
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: { status: 'CONNECTED' },
      models,
      gpuBridge,
      storageCdn,
    });
  } catch (error: any) {
    console.error('[API avatar-model-status] Failed to inspect avatar infrastructure:', error);
    return NextResponse.json(
      {
        success: false,
        database: { status: 'UNAVAILABLE' },
        error: error?.message || 'Failed to inspect avatar infrastructure',
      },
      { status: 500 }
    );
  }
}
