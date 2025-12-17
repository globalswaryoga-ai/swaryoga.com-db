'use client';

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import Navigation from './Navigation';
import Footer from './Footer';

interface PageSection {
  id: string;
  title: {
    en: string;
    hi: string;
    mr: string;
  };
  excerpt?: {
    en: string;
    hi: string;
    mr: string;
  };
  author?: string;
  date?: string;
  readTime?: {
    en: string;
    hi: string;
    mr: string;
  };
  image: string;
  slug: string;
  category: string;
  content?: {
    en: string;
    hi: string;
    mr: string;
  };
}

interface GeneralPageProps {
  pageTitle: {
    en: string;
    hi: string;
    mr: string;
  };
  breadcrumb: {
    en: string;
    hi: string;
    mr: string;
  };
  headerImage: string;
  items: PageSection[];
  categories: string[];
  translations: {
    pageTitle: { en: string; hi: string; mr: string };
    breadcrumb: { en: string; hi: string; mr: string };
    featuredPost?: { en: string; hi: string; mr: string };
    readFullArticle?: { en: string; hi: string; mr: string };
    welcomeTitle?: { en: string; hi: string; mr: string };
    welcomeText?: { en: string; hi: string; mr: string };
    comingSoonTitle?: { en: string; hi: string; mr: string };
    comingSoonText?: { en: string; hi: string; mr: string };
    exploreWorkshops?: { en: string; hi: string; mr: string };
    subscribeUpdates?: { en: string; hi: string; mr: string };
    newsletterTitle?: { en: string; hi: string; mr: string };
    newsletterText?: { en: string; hi: string; mr: string };
    emailPlaceholder?: { en: string; hi: string; mr: string };
    subscribe?: { en: string; hi: string; mr: string };
    [key: string]: { en: string; hi: string; mr: string } | undefined;
  };
  showNewsletter?: boolean;
  showAboutSection?: boolean;
  aboutSectionContent?: {
    en: string;
    hi: string;
    mr: string;
  };
  showComingSoon?: boolean;
  children?: ReactNode;
}

const GeneralPage: React.FC<GeneralPageProps> = ({
  pageTitle,
  breadcrumb,
  headerImage,
  items,
  categories,
  translations,
  showNewsletter = true,
  showAboutSection = true,
  aboutSectionContent,
  showComingSoon = true,
  children,
}) => {
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

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

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      Health: 'bg-green-100 text-green-800',
      Education: 'bg-blue-100 text-blue-800',
      Lifestyle: 'bg-orange-100 text-orange-800',
      Spiritual: 'bg-purple-100 text-purple-800',
      Workshop: 'bg-red-100 text-red-800',
      Resource: 'bg-indigo-100 text-indigo-800',
      News: 'bg-yellow-100 text-yellow-800',
      Events: 'bg-pink-100 text-pink-800',
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="pt-16">
      <Navigation />

      {/* Header Section */}
      <div className="relative h-64 md:h-80 bg-gray-900 overflow-hidden">
        <img
          src={headerImage}
          alt={pageTitle[language]}
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-center text-white animate-fade-in"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{pageTitle[language]}</h1>
            <p className="text-lg text-gray-300">{breadcrumb[language]}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-12">
        {/* Language Selector */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {(['en', 'hi', 'mr'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  language === lang
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getLanguageText(lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full hover:shadow-xl transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative h-48">
                <img
                  src={item.image}
                  alt={item.title[language]}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                      item.category
                    )}`}
                  >
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                  {item.title[language]}
                </h2>

                {item.excerpt && (
                  <p className="text-gray-600 mb-4 flex-1 line-clamp-3">
                    {item.excerpt[language]}
                  </p>
                )}

                <div className="mt-auto">
                  {(item.author || item.date || item.readTime) && (
                    <div className="flex items-center text-sm text-gray-500 mb-4 flex-wrap gap-2">
                      {item.author && <span>{item.author}</span>}
                      {item.date && <span>•</span>}
                      {item.date && <span>{formatDate(item.date)}</span>}
                      {item.readTime && <span>•</span>}
                      {item.readTime && <span>{item.readTime[language]}</span>}
                    </div>
                  )}

                  <Link
                    href={`/${breadcrumb.en.toLowerCase()}/${item.slug}`}
                    className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    {translations.readFullArticle?.[language] || 'Read More'}
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* About Section */}
        {showAboutSection && aboutSectionContent && (
          <div
            className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 text-center mb-12 animate-fade-in"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {translations.welcomeTitle?.[language] || 'Welcome'}
            </h3>
            <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {aboutSectionContent[language]}
            </p>
          </div>
        )}

        {/* Coming Soon Section */}
        {showComingSoon && (
          <div
            className="text-center py-12 bg-white rounded-lg shadow-md mb-12 animate-fade-in"
          >
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              {translations.comingSoonTitle?.[language] || 'More Coming Soon'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              {translations.comingSoonText?.[language] || 'Stay tuned for more updates.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/workshop"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                {translations.exploreWorkshops?.[language] || 'Explore'}
              </Link>
              <Link
                href="/contact"
                className="border border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-6 py-3 rounded-lg transition-colors"
              >
                {translations.subscribeUpdates?.[language] || 'Subscribe'}
              </Link>
            </div>
          </div>
        )}

        {/* Newsletter Section */}
        {showNewsletter && (
          <div
            className="bg-green-600 rounded-lg p-8 text-center text-white mb-12 animate-fade-in"
          >
            <h3 className="text-2xl font-bold mb-4">
              {translations.newsletterTitle?.[language] || 'Stay Updated'}
            </h3>
            <p className="mb-6 max-w-2xl mx-auto">
              {translations.newsletterText?.[language] || 'Subscribe for updates.'}
            </p>
            <div className="max-w-md mx-auto flex">
              <input
                type="email"
                placeholder={translations.emailPlaceholder?.[language] || 'Enter your email'}
                className="flex-1 px-4 py-2 rounded-l-lg text-gray-800 focus:outline-none"
              />
              <button className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-r-lg transition-colors font-medium">
                {translations.subscribe?.[language] || 'Subscribe'}
              </button>
            </div>
          </div>
        )}

        {/* Custom Children Content */}
        {children && <div className="mt-12">{children}</div>}
      </div>

      <Footer />
    </div>
  );
};

export default GeneralPage;
