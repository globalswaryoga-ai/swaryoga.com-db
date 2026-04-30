'use client';

import { useEffect, useRef } from 'react';

interface SimpleVideoPlayerProps {
  src: string;
  className?: string;
}

export default function SimpleVideoPlayer({ src, className = 'w-full h-full' }: SimpleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Remove controls attribute if it exists
    videoRef.current.removeAttribute('controls');

    // Force inline styles to override everything
    videoRef.current.style.width = '100%';
    videoRef.current.style.height = '100%';
    videoRef.current.style.display = 'block';
    videoRef.current.style.backgroundColor = '#000';
    videoRef.current.style.outline = 'none';
    videoRef.current.style.border = 'none';
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      crossOrigin="anonymous"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        backgroundColor: '#000',
        outline: 'none',
        border: 'none',
      }}
    />
  );
}
