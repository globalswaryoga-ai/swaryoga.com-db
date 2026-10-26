import { NextRequest, NextResponse } from 'next/server';
import { heygenAdapter } from '@/lib/avatarExtraction/providers/heygenAdapter';
import { replicateAdapter } from '@/lib/avatarExtraction/providers/replicateAdapter';
import { swarNeuralAdapter } from '@/lib/avatarExtraction/providers/swarNeuralAdapter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [heygenAvatars] = await Promise.all([
      heygenAdapter.isConfigured() ? heygenAdapter.fetchExistingAvatars().catch(() => []) : Promise.resolve([]),
    ]);

    const providers = [
      {
        id: 'swar_neural',
        name: 'Swar Neural Edge Identity Engine (Recommended)',
        description: 'Native 468-point 3D facial landmark mesh, 52 ARKit facial blendshapes, and deep cosine identity embedding. Zero latency, no external credits needed.',
        configured: true,
        badge: 'Built-in & Unlimited',
        requiresConsent: true,
        supportedLanguages: ['Hindi', 'Sanskrit', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu'],
        capabilities: ['3d_face_mesh', 'expression_blendshapes', 'voice_sync', 'reusable_identity', 'multi_angle_alignment'],
      },
      {
        id: 'heygen',
        name: 'HeyGen Digital Twin Cloud',
        description: 'Industry-standard studio digital twin with lip-sync and motion diffusion. Linked to your official HeyGen account.',
        configured: heygenAdapter.isConfigured(),
        badge: heygenAdapter.isConfigured() ? 'Connected' : 'Missing API Key',
        requiresConsent: true,
        supportedLanguages: ['Hindi', 'English', 'Spanish', 'French', 'Japanese', 'German', 'Over 40+'],
        existingAvatarsCount: heygenAvatars.length,
        existingAvatars: heygenAvatars.slice(0, 5),
        capabilities: ['photorealistic_video', 'cloud_lip_sync', 'studio_lighting', 'voice_cloning'],
      },
      {
        id: 'replicate',
        name: 'Replicate LivePortrait & GFPGAN',
        description: 'Open neural stitching and high-fidelity face reenactment with LivePortrait and GFPGAN face restoration.',
        configured: replicateAdapter.isConfigured(),
        badge: replicateAdapter.isConfigured() ? 'Connected' : 'Missing API Key',
        requiresConsent: true,
        supportedLanguages: ['Hindi', 'English', 'Multilingual'],
        capabilities: ['live_portrait_stitching', 'gfpgan_enhancer', 'audio2head_reenactment'],
      },
    ];

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error: any) {
    console.error('Provider status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check provider statuses' },
      { status: 500 }
    );
  }
}
