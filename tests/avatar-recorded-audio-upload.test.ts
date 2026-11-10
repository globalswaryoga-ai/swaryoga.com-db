/** @jest-environment jsdom */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/auth', () => ({
  extractTokenFromRequest: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/crm-handlers', () => ({
  getViewerUserId: jest.fn(),
}));

jest.mock('@/lib/bunny-storage', () => ({
  generateAvatarAudioPresignedUrl: jest.fn(),
  uploadUserFile: jest.fn(),
}));

import type { NextRequest } from 'next/server';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { generateAvatarAudioPresignedUrl, uploadUserFile } from '@/lib/bunny-storage';
import { POST } from '@/app/api/avatar/inhouse/audio/upload/route';

function makeRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) formData.set('file', file);
  return {
    headers: { get: () => null },
    formData: jest.fn().mockResolvedValue(formData),
  } as unknown as NextRequest;
}

function makeFile(bytes: number[], name: string): File {
  const file = new File([new Uint8Array(bytes)], name, { type: 'audio/mpeg' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => Uint8Array.from(bytes).buffer,
  });
  return file;
}

describe('recorded avatar audio upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY = 'test-key';
    process.env.BUNNY_AVATAR_AUDIO_CDN_HOST = 'avatarmohan.b-cdn.net';
    jest.mocked(extractTokenFromRequest).mockReturnValue('valid-token');
    jest.mocked(verifyToken).mockReturnValue({ userId: 'audio-owner', isAdmin: true } as never);
    jest.mocked(getViewerUserId).mockReturnValue('audio-owner');
    jest.mocked(uploadUserFile).mockResolvedValue({
      url: 'https://cdn.example/audio.mp3',
      storagePath: 'users/audio-owner/avatar-audio/recording.mp3',
      sizeBytes: 6,
    });
    jest.mocked(generateAvatarAudioPresignedUrl).mockResolvedValue('https://avatarmohan.b-cdn.net/audio.mp3?token=signed');
  });

  it('requires an authenticated admin before parsing or uploading the file', async () => {
    jest.mocked(verifyToken).mockReturnValue(null);
    const request = makeRequest();

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(request.formData).not.toHaveBeenCalled();
    expect(uploadUserFile).not.toHaveBeenCalled();
  });

  it('fails closed when Bunny token authentication is not configured', async () => {
    delete process.env.BUNNY_AVATAR_AUDIO_TOKEN_KEY;
    const request = makeRequest();

    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(request.formData).not.toHaveBeenCalled();
    expect(uploadUserFile).not.toHaveBeenCalled();
  });

  it('fails closed when the dedicated audio Pull Zone host is missing', async () => {
    delete process.env.BUNNY_AVATAR_AUDIO_CDN_HOST;
    const request = makeRequest();

    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(request.formData).not.toHaveBeenCalled();
    expect(uploadUserFile).not.toHaveBeenCalled();
  });

  it('rejects renamed non-audio content without uploading it', async () => {
    const file = makeFile([0, 1, 2, 3], 'recording.mp3');
    const response = await POST(makeRequest(file));

    expect(response.status).toBe(415);
    expect(uploadUserFile).not.toHaveBeenCalled();
  });

  it("stores valid MP3 under the authenticated user's path and returns a signed preview URL", async () => {
    const file = makeFile([0x49, 0x44, 0x33, 1, 2, 3], 'recording.mp3');
    const response = await POST(makeRequest(file));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(uploadUserFile).toHaveBeenCalledWith(
      Buffer.from([0x49, 0x44, 0x33, 1, 2, 3]),
      'recording.mp3',
      'audio-owner',
      'avatar-audio',
      'audio/mpeg',
    );
    expect(generateAvatarAudioPresignedUrl).toHaveBeenCalledWith(
      'users/audio-owner/avatar-audio/recording.mp3',
      { expiresIn: 7 * 24 * 60 * 60 },
    );
    expect(result.audioUrl).toContain('?token=signed');
  });
});
