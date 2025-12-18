import { ImageResponse } from 'next/og';

export const size = {
  width: 192,
  height: 192
};

export const contentType = 'image/png';

export default function Icon() {
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
          SY
        </div>
      </div>
    ),
    size
  );
}
