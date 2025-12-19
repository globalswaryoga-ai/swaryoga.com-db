import type { Metadata, Viewport } from 'next';
import './globals.css';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import AppInitializer from '@/components/AppInitializer';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Swar Yoga - Transform Your Life Through Yoga',
  description: 'Discover authentic yoga classes, wellness products, and holistic health solutions at Swar Yoga.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#2D6A4F" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof performance !== 'undefined' && performance.mark) {
                performance.mark('page-load-start');
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white text-swar-text overflow-x-hidden">
        <AppInitializer />
        {children}
        <WhatsAppWidget />
      </body>
    </html>
  );
}
