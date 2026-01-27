'use client';

import Script from 'next/script';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateCourseSchema,
  generateFAQSchema,
  generateArticleSchema,
  generateVideoSchema,
} from '@/lib/seo';

interface JsonLdProps {
  data: Record<string, any>;
}

// Generic JSON-LD component
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Organization Schema - Use on all pages
export function OrganizationJsonLd() {
  return <JsonLd data={generateOrganizationSchema()} />;
}

// Website Schema - Use on homepage
export function WebsiteJsonLd() {
  return <JsonLd data={generateWebsiteSchema()} />;
}

// Course Schema - Use on course/workshop pages
export function CourseJsonLd({
  name,
  description,
  mode,
  level,
}: {
  name: string;
  description: string;
  mode?: string;
  level?: string;
}) {
  return <JsonLd data={generateCourseSchema({ name, description, mode, level })} />;
}

// FAQ Schema - Use on FAQ pages
export function FAQJsonLd({ questions }: { questions: { question: string; answer: string }[] }) {
  return <JsonLd data={generateFAQSchema(questions)} />;
}

// Article Schema - Use on blog posts
export function ArticleJsonLd({
  title,
  description,
  image,
  author,
  publishedAt,
  updatedAt,
}: {
  title: string;
  description: string;
  image: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
}) {
  return (
    <JsonLd
      data={generateArticleSchema({ title, description, image, author, publishedAt, updatedAt })}
    />
  );
}

// Video Schema - Use on video/recording pages
export function VideoJsonLd({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  embedUrl,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  embedUrl?: string;
}) {
  return (
    <JsonLd
      data={generateVideoSchema({ name, description, thumbnailUrl, uploadDate, duration, embedUrl })}
    />
  );
}

// Breadcrumb Schema
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={breadcrumbSchema} />;
}

// Local Business Schema - For yoga studio
export function LocalBusinessJsonLd({
  name,
  address,
  phone,
  image,
  priceRange,
  openingHours,
}: {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  image?: string;
  priceRange?: string;
  openingHours?: string[];
}) {
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    '@id': 'https://swaryoga.com',
    name,
    image: image || 'https://swaryoga.com/og-image.jpg',
    telephone: phone,
    priceRange: priceRange || '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    openingHoursSpecification: openingHours?.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hours.split(' ')[0],
      opens: hours.split(' ')[1]?.split('-')[0],
      closes: hours.split(' ')[1]?.split('-')[1],
    })),
    sameAs: [
      'https://www.facebook.com/swaryoga',
      'https://www.instagram.com/swaryoga',
      'https://www.youtube.com/@swaryoga',
    ],
  };

  return <JsonLd data={localBusinessSchema} />;
}

// Event Schema - For workshops
export function EventJsonLd({
  name,
  description,
  startDate,
  endDate,
  location,
  image,
  price,
  currency = 'INR',
  url,
  organizer,
}: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string | { name: string; address: string };
  image?: string;
  price?: number;
  currency?: string;
  url?: string;
  organizer?: string;
}) {
  const isOnline = typeof location === 'string' && location.toLowerCase().includes('online');
  
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    endDate: endDate || startDate,
    image: image || 'https://swaryoga.com/og-image.jpg',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: isOnline
      ? {
          '@type': 'VirtualLocation',
          url: url || 'https://swaryoga.com',
        }
      : {
          '@type': 'Place',
          name: typeof location === 'string' ? location : location.name,
          address: typeof location === 'string' ? location : location.address,
        },
    organizer: {
      '@type': 'Organization',
      name: organizer || 'Swar Yoga',
      url: 'https://swaryoga.com',
    },
    offers: price
      ? {
          '@type': 'Offer',
          price: price.toString(),
          priceCurrency: currency,
          availability: 'https://schema.org/InStock',
          url: url || 'https://swaryoga.com',
        }
      : undefined,
  };

  return <JsonLd data={eventSchema} />;
}

// Review/Rating Schema
export function AggregateRatingJsonLd({
  itemName,
  ratingValue,
  reviewCount,
  bestRating = 5,
  worstRating = 1,
}: {
  itemName: string;
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}) {
  const ratingSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: itemName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ratingValue.toFixed(1),
      reviewCount,
      bestRating,
      worstRating,
    },
  };

  return <JsonLd data={ratingSchema} />;
}
