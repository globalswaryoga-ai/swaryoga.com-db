import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Workshop Recordings',
  description: 'Access recorded yoga and pranayama workshops. Watch previous sessions on Swar Yoga, breathing techniques, and more.',
  url: '/community/recordings',
  keywords: ['yoga recordings', 'workshop videos', 'pranayama videos', 'yoga classes online'],
});

export default function RecordingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
