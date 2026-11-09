import { getBunnyStreamEmbedUrl } from '@/lib/avatarStudio/bunnyStream';
import { MOHAN_WORKSHOP_TWIN_SOURCES } from '@/lib/avatarStudio/mohanWorkshopTwinSources';

describe('Bunny Stream preview URLs', () => {
  it('converts the provided player URL to the iframe player host and embed path', () => {
    expect(
      getBunnyStreamEmbedUrl(
        'https://player.mediadelivery.net/play/606386/247e9982-7723-49bb-a327-d923c67e543a'
      )
    ).toBe(
      'https://iframe.mediadelivery.net/embed/606386/247e9982-7723-49bb-a327-d923c67e543a'
    );
  });

  it('converts every supplied Mohan Sir workshop player URL', () => {
    for (const source of MOHAN_WORKSHOP_TWIN_SOURCES) {
      const videoId = source.videoUrl.split('/').pop();
      expect(getBunnyStreamEmbedUrl(source.videoUrl)).toBe(
        `https://iframe.mediadelivery.net/embed/606386/${videoId}`
      );
    }
  });

  it('normalizes an existing embed URL and preserves query parameters', () => {
    expect(
      getBunnyStreamEmbedUrl(
        'https://iframe.mediadelivery.net/embed/606386/video-id?autoplay=true'
      )
    ).toBe('https://iframe.mediadelivery.net/embed/606386/video-id?autoplay=true');
  });

  it('does not trust lookalike or non-HTTPS player hosts', () => {
    expect(getBunnyStreamEmbedUrl('https://evil.mediadelivery.net/play/606386/video-id')).toBeNull();
    expect(getBunnyStreamEmbedUrl('http://player.mediadelivery.net/play/606386/video-id')).toBeNull();
  });
});
