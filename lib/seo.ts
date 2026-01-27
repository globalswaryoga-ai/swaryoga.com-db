import { Metadata } from 'next';

// Site Configuration
export const siteConfig = {
  name: 'Swar Yoga',
  title: 'Swar Yoga - Ancient Breathing Science for Modern Life',
  description: 'Learn the ancient science of Swar Yoga (Swara Yoga) - breath-based healing, pranayama techniques, and yogic lifestyle for health, wellness, and spiritual growth.',
  url: 'https://swaryoga.com',
  ogImage: 'https://swaryoga.com/og-image.jpg',
  author: 'Swar Yoga Foundation',
  keywords: [
    'swar yoga',
    'swara yoga',
    'pranayama',
    'breathing techniques',
    'yoga classes',
    'meditation',
    'wellness',
    'health',
    'spiritual growth',
    'yoga india',
    'online yoga classes',
    'breath healing',
    'nostril breathing',
    'ida pingala',
    'nadi shodhana',
  ],
  locale: 'en_IN',
  type: 'website',
  twitterHandle: '@swaryoga',
};

// Generate metadata for pages
export function generateMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords = [],
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const pageTitle = title 
    ? `${title} | ${siteConfig.name}` 
    : siteConfig.title;
  const pageDescription = description || siteConfig.description;
  const pageImage = image || siteConfig.ogImage;
  const pageUrl = url ? `${siteConfig.url}${url}` : siteConfig.url;
  const allKeywords = [...siteConfig.keywords, ...keywords];

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: allKeywords,
    authors: [{ name: siteConfig.author }],
    creator: siteConfig.author,
    publisher: siteConfig.author,
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: pageUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
      locale: siteConfig.locale,
      type: type,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [pageImage],
      creator: siteConfig.twitterHandle,
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  };
}

// Schema.org Types
export interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    '@type': 'ContactPoint';
    telephone: string;
    contactType: string;
    availableLanguage: string[];
  };
}

export interface WebsiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

export interface CourseSchema {
  '@context': 'https://schema.org';
  '@type': 'Course';
  name: string;
  description: string;
  provider: {
    '@type': 'Organization';
    name: string;
    url: string;
  };
  courseMode: string;
  educationalLevel: string;
}

export interface FAQSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  image: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
}

export interface VideoSchema {
  '@context': 'https://schema.org';
  '@type': 'VideoObject';
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
}

// Schema Generators
export function generateOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: siteConfig.description,
    sameAs: [
      'https://www.facebook.com/swaryoga',
      'https://www.instagram.com/swaryoga',
      'https://www.youtube.com/@swaryoga',
      'https://twitter.com/swaryoga',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-XXXXXXXXXX',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi'],
    },
  };
}

export function generateWebsiteSchema(): WebsiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateCourseSchema(course: {
  name: string;
  description: string;
  mode?: string;
  level?: string;
}): CourseSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    courseMode: course.mode || 'online',
    educationalLevel: course.level || 'beginner',
  };
}

export function generateFAQSchema(questions: { question: string; answer: string }[]): FAQSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  image: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
}): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logo.png`,
      },
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
  };
}

export function generateVideoSchema(video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  embedUrl?: string;
}): VideoSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    duration: video.duration,
    embedUrl: video.embedUrl,
  };
}
