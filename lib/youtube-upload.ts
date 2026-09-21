import { google } from 'googleapis';
import { Readable } from 'stream';

export async function uploadToYouTube(
  accessToken: string,
  videoBuffer: Buffer,
  metadata: { title: string; description?: string; privacyStatus?: 'public' | 'unlisted' | 'private' }
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth });

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description || '',
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'unlisted',
        embeddable: true,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: Readable.from(videoBuffer),
    },
  });

  return {
    videoId: res.data.id,
    url: `https://youtu.be/${res.data.id}`,
  };
}
