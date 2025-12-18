import { promises as fs } from 'fs';
import path from 'path';

export const size = {
  width: 192,
  height: 192
};

export const contentType = 'image/png';

export default async function Icon() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const imageData = await fs.readFile(logoPath);
    return new Response(imageData, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error) {
    // Fallback to generated icon if logo not found
    const { ImageResponse } = await import('next/og');
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '48px'
          }}
        >
          <div
            style={{
              width: '85%',
              height: '85%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1E7F43',
              borderRadius: '40px',
              fontSize: '80px',
              fontWeight: 'bold',
              color: '#F27A2C',
              fontFamily: 'system-ui',
              letterSpacing: '-2px'
            }}
          >
            Logo
          </div>
        </div>
      ),
      size
    );
  }
}
