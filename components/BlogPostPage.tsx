'use client';

import React, { useState, ReactNode } from 'react';
import { Calendar, User, Clock, ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';
import Navigation from './Navigation';
import Footer from './Footer';

interface BlogPostPageProps {
  title: {
    en: string;
    hi: string;
    mr: string;
  };
  breadcrumbs: Array<{
    name: string;
    path: string;
  }>;
  headerImage: string;
  author: string;
  date: string;
  readTime: {
    en: string;
    hi: string;
    mr: string;
  };
  category?: string;
  children: ReactNode;
  authorBio?: {
    en: string;
    hi: string;
    mr: string;
  };
  authorTitle?: string;
  authorInitials?: string;
  backLinkText?: {
    en: string;
    hi: string;
    mr: string;
  };
  shareText?: {
    en: string;
    hi: string;
    mr: string;
  };
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({
  title,
  breadcrumbs,
  headerImage,
  author,
  date,
  readTime,
  category,
  children,
  authorBio,
  authorTitle = 'Author',
  authorInitials = 'MK',
  backLinkText,
  shareText,
}) => {
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(
      language === 'en' ? 'en-US' :
        language === 'hi' ? 'hi-IN' : 'mr-IN',
      options
    );
  };

  const getCategoryColor = (cat?: string) => {
    const colorMap: { [key: string]: string } = {
      Health: 'bg-swar-primary-light text-swar-primary',
      Education: 'bg-blue-100 text-blue-800',
      Lifestyle: 'bg-orange-100 text-orange-800',
      Spiritual: 'bg-purple-100 text-purple-800',
      Research: 'bg-swar-primary-light text-red-800',
      Wellness: 'bg-indigo-100 text-indigo-800',
    };
    return colorMap[cat || ''] || 'bg-swar-primary-light text-swar-text';
  };

  const getLanguageText = (lang: 'en' | 'hi' | 'mr') => {
    switch (lang) {
      case 'en':
        return 'English';
      case 'hi':
        return 'हिंदी';
      case 'mr':
        return 'मराठी';
      default:
        return 'English';
    }
  };

  const defaultTranslations = {
    backLink: backLinkText || {
      en: 'Back to Blog',
      hi: 'ब्लॉग पर वापस जाएं',
      mr: 'ब्लॉगवर परत जा',
    },
    share: shareText || {
      en: 'Share',
      hi: 'साझा करें',
      mr: 'शेअर करा',
    },
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title[language],
          text: `Check out this article: ${title[language]}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="pt-16">
      <Navigation />

      {/* Header Section */}
      <div className="relative h-64 md:h-80 bg-gray-900 overflow-hidden">
        <img
          src={headerImage}
          alt={title[language]}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="text-center text-white px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{title[language]}</h1>
            {category && (
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
                {category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="bg-swar-bg border-b py-4">
        <div className="container mx-auto px-4 md:px-6 flex justify-center">
          <div className="inline-flex bg-white rounded-lg p-1 shadow-sm">
            {(['en', 'hi', 'mr'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  language === lang
                    ? 'bg-swar-primary text-white'
                    : 'text-swar-text hover:bg-swar-primary-light'
                }`}
              >
                {getLanguageText(lang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="py-12 md:py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-8">
              <Link
                href={breadcrumbs[0]?.path || '/blog'}
                className="inline-flex items-center text-swar-primary hover:text-swar-primary transition-colors font-medium"
              >
                <ArrowLeft size={20} className="mr-2" />
                {defaultTranslations.backLink[language]}
              </Link>
            </div>

            {/* Blog Meta Info */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 pb-8 border-b">
              <div className="flex flex-wrap items-center gap-6 text-swar-text-secondary text-sm md:text-base">
                <div className="flex items-center">
                  <Calendar size={18} className="mr-2 text-swar-primary" />
                  <span>{formatDate(date)}</span>
                </div>
                <div className="flex items-center">
                  <User size={18} className="mr-2 text-swar-primary" />
                  <span>{author}</span>
                </div>
                <div className="flex items-center">
                  <Clock size={18} className="mr-2 text-swar-primary" />
                  <span>{readTime[language]}</span>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center text-swar-primary hover:text-swar-primary transition-colors font-medium"
              >
                <Share2 size={18} className="mr-2" />
                {defaultTranslations.share[language]}
              </button>
            </div>

            {/* Main Content */}
            <div className="prose prose-lg max-w-none mb-12">
              {children}
            </div>

            {/* Author Bio */}
            {authorBio && (
              <div className="flex items-start p-6 bg-swar-primary-light rounded-lg border border-green-100">
                <div className="w-16 h-16 bg-swar-primary rounded-full flex items-center justify-center shadow-lg mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-white">{authorInitials}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-swar-text text-lg">{author}</h3>
                  <p className="text-swar-primary font-medium mb-2">{authorTitle}</p>
                  <p className="text-swar-text text-sm leading-relaxed">
                    {authorBio[language]}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Related Posts Section (Optional) */}
      <div className="bg-swar-bg py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-swar-text mb-4">Explore More</h2>
            <p className="text-swar-text-secondary mb-8">
              {language === 'en' && 'Check out our other articles for more wellness insights.'}
              {language === 'hi' && 'अधिक स्वास्थ्य अंतर्दृष्टि के लिए हमारे अन्य लेख देखें।'}
              {language === 'mr' && 'अधिक आरोग्य अंतर्दृष्टीसाठी आमचे इतर लेख पहा.'}
            </p>
            <Link
              href="/blog"
              className="inline-block bg-swar-primary hover:bg-swar-primary text-white px-8 py-3 rounded-lg transition-colors font-medium"
            >
              {language === 'en' && 'Back to Blog'}
              {language === 'hi' && 'ब्लॉग पर वापस जाएं'}
              {language === 'mr' && 'ब्लॉगवर परत जा'}
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
