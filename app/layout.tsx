import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import AppInitializer from '@/components/AppInitializer';
import { CartProvider } from '@/lib/context/CartContext';
import { Space_Grotesk } from 'next/font/google';
import { siteConfig } from '@/lib/seo';
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/seo/JsonLd';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  publisher: siteConfig.author,
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
    locale: siteConfig.locale,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
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
        
        {/* Phosphor Icons */}
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css" />
        <Script src="https://unpkg.com/@phosphor-icons/web@2.1.1" strategy="afterInteractive" />
        
        {/* Google Tag Manager (GTM) - Install through this for recommended setup */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-5MB3M7KZ');
              window.dataLayer = window.dataLayer || [];
            `,
          }}
        />

        {/* Meta Pixel Code - Latest version with event tracking */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '906922940547021');
              fbq('track', 'PageView');
              
              // Enhanced tracking for cost optimization
              document.addEventListener('DOMContentLoaded', function() {
                // Track when user views content (sessions, workshops, investments)
                const contentElements = document.querySelectorAll('[data-track-view]');
                contentElements.forEach(el => {
                  el.addEventListener('click', function() {
                    const contentName = this.getAttribute('data-content-name');
                    const contentType = this.getAttribute('data-content-type');
                    const price = this.getAttribute('data-price');
                    if (contentName) {
                      fbq('track', 'ViewContent', {
                        content_name: contentName,
                        content_type: contentType || 'product',
                        value: price || undefined,
                        currency: 'INR'
                      });
                    }
                  });
                });
              });
            `,
          }}
        />
        
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
        {/* Schema.org JSON-LD */}
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        
        <CartProvider>
          <AppInitializer />
          {children}
          <WhatsAppWidget />
        </CartProvider>
      </body>
    </html>
  );
}
