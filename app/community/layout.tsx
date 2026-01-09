import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Swar Yoga Community',
  description: 'swaryoga.com - From Breath To Soul',
  metadataBase: new URL('https://swaryoga.com'),
  openGraph: {
    title: 'Join Swar Yoga Community',
    description: 'swaryoga.com - From Breath To Soul',
    url: '/community',
    siteName: 'swaryoga.com',
    images: [
      {
        url: 'https://swaryoga.com/logo.png',
        width: 1200,
        height: 630,
        alt: 'Swar Yoga Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Swar Yoga Community',
    description: 'swaryoga.com - From Breath To Soul',
    images: ['https://swaryoga.com/logo.png'],
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
