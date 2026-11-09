import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const inferenceConfigured = Boolean(
    process.env.AVATAR_INFERENCE_URL &&
    process.env.AVATAR_INFERENCE_TOKEN &&
    process.env.AVATAR_WORKER_TOKEN
  );

  return NextResponse.json({
    success: true,
    providers: [
      {
        id: 'swar_inhouse_queue',
        name: 'Swar Yoga In-house Render Queue',
        description: 'Consent-gated Bunny SQL queue with speech preparation and a worker protocol; neural rendering is not verified.',
        configured: inferenceConfigured,
        status: inferenceConfigured ? 'configured_not_verified' : 'queue_only',
        badge: inferenceConfigured ? 'Configuration present; runtime unverified' : 'Queue available; GPU worker not configured',
        requiresConsent: true,
        supportedLanguages: ['Hindi', 'Marathi', 'English'],
        capabilities: ['consent_gated_queue', 'speech_preparation', 'worker_protocol'],
      },
    ],
  });
}
