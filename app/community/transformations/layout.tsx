import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Yoga Transformation Stories',
  description: 'Inspiring transformation stories from our yoga community. See real before & after results and read how yoga changed lives.',
  url: '/community/transformations',
  keywords: ['yoga transformation', 'yoga success stories', 'yoga before after', 'health transformation'],
});

export default function TransformationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
