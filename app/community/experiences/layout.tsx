import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Community Experiences & Testimonials',
  description: 'Read real testimonials and experiences from Swar Yoga community members. See how yoga and pranayama transformed lives.',
  url: '/community/experiences',
  keywords: ['yoga testimonials', 'swar yoga reviews', 'yoga success stories', 'pranayama benefits'],
});

export default function ExperiencesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
