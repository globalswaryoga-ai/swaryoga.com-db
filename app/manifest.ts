import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Swar Yoga - Ancient Breathing Science',
    short_name: 'Swar Yoga',
    description: 'Learn the ancient Vedic science of Swar Yoga (Swara Yoga) - breath-based healing, Shiva Swarodaya, and pranayama techniques by Mohan Kalburgi.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2D6A4F',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-square.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
