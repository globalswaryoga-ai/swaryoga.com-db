/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { startFacialExtractionJob } from '@/lib/mohanRag/facialExpressionService';
import { POST } from '@/app/api/admin/crm/mohan-rag/avatar-dna/route';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(() => ({ userId: 'admincrm' })),
}));
jest.mock('@/lib/crm-handlers', () => ({
  isSuperAdmin: jest.fn(() => true),
}));
jest.mock('@/lib/mohanRag/avatarDnaRepository', () => ({}));
jest.mock('@/lib/mohanRag/avatarConfig', () => ({
  saveMohanRagAvatarConfig: jest.fn(),
}));
jest.mock('@/lib/mohanRag/facialExpressionService', () => ({
  startFacialExtractionJob: jest.fn(),
}));

describe('Mohan RAG avatar DNA facial extraction action', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts the real extraction job and returns its persisted job identity', async () => {
    (startFacialExtractionJob as jest.Mock).mockResolvedValue({
      id: 'face_job_real',
      status: 'pending',
      video_url: 'https://example.com/lesson.mp4',
    });
    const request = new NextRequest('https://swaryoga.com/api/admin/crm/mohan-rag/avatar-dna', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'extract_facial',
        videoUrl: 'https://example.com/lesson.mp4',
        sampleFps: 1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      jobId: 'face_job_real',
      status: 'pending',
    });
    expect(startFacialExtractionJob).toHaveBeenCalledWith({
      videoUrl: 'https://example.com/lesson.mp4',
      sourceId: undefined,
      sampleFps: 1,
    });
    expect(isSuperAdmin).toHaveBeenCalled();
  });

  it('rejects a missing video URL instead of returning a fake scheduled job', async () => {
    const request = new NextRequest('https://swaryoga.com/api/admin/crm/mohan-rag/avatar-dna', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'extract_facial' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(startFacialExtractionJob).not.toHaveBeenCalled();
  });
});
