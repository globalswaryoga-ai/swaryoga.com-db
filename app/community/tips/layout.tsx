import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Health & Wellness Tips',
  description: 'Expert tips and tricks for yoga, pranayama, health, nutrition, and lifestyle. Get practical advice from our wellness experts.',
  url: '/community/tips',
  keywords: ['yoga tips', 'health tips', 'pranayama tips', 'wellness advice', 'nutrition tips'],
});

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
