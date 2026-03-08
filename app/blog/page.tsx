'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Calendar, ArrowRight, Search, Clock, MessageSquare } from 'lucide-react';

interface BlogPost {
  id: string;
  title: {
    en: string;
    hi: string;
    mr: string;
  };
  excerpt: {
    en: string;
    hi: string;
    mr: string;
  };
  author: string;
  date: string;
  readTime: {
    en: string;
    hi: string;
    mr: string;
  };
  image: string;
  slug: string;
  category: string;
  featured?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: {
      en: 'Mastering Sleep Postures for Better Health with Swar Yoga',
      hi: 'स्वर योग के साथ बेहतर स्वास्थ्य के लिए नींद की मुद्राओं में महारत हासिल करना',
      mr: 'स्वर योगासह उत्तम आरोग्यासाठी झोपेच्या मुद्रांमध्ये प्रावीण्य मिळवणे'
    },
    excerpt: {
      en: 'Discover how Swar Yoga provides insights into optimal sleep positioning for enhanced health and well-being. Learn the ancient science of breath and its profound impact on your sleep quality.',
      hi: 'जानें कैसे स्वर योग बेहतर स्वास्थ्य और कल्याण के लिए सर्वोत्तम नींद की स्थिति के बारे में अंतर्दृष्टि प्रदान करता है।',
      mr: 'स्वर योग कसे उत्तम आरोग्य आणि कल्याणासाठी झोपेच्या स्थितीबद्दल अंतर्दृष्टी देतो हे शोधा.'
    },
    author: 'Yogacharya Mohan Kalburgi',
    date: '2024-12-15',
    readTime: {
      en: '8 min read',
      hi: '8 मिनट का पठन',
      mr: '8 मिनिटांचे वाचन'
    },
    image: 'https://i.postimg.cc/KzWbNy21/temp-Imagep-Ji-Dk-Y.avif',
    slug: 'sleep-postures-swar-yoga',
    category: 'Health',
    featured: true
  },
  {
    id: '2',
    title: {
      en: 'The Science of Breath: Understanding Swar Yoga Fundamentals',
      hi: 'श्वास का विज्ञान: स्वर योग के मूल सिद्धांतों को समझना',
      mr: 'श्वासाचे विज्ञान: स्वर योगाच्या मूलभूत तत्त्वांचे आकलन'
    },
    excerpt: {
      en: 'Explore the foundational principles of Swar Yoga and how the science of breath connects to every aspect of your physical and mental wellbeing.',
      hi: 'स्वर योग के मूलभूत सिद्धांतों और श्वास का विज्ञान आपके शारीरिक और मानसिक कल्याण से कैसे जुड़ा है।',
      mr: 'स्वर योगाच्या मूलभूत तत्त्वांचा शोध घ्या आणि श्वासाचे विज्ञान कसे जोडलेले आहे.'
    },
    author: 'Yogacharya Mohan Kalburgi',
    date: '2024-12-10',
    readTime: {
      en: '10 min read',
      hi: '10 मिनट का पठन',
      mr: '10 मिनिटांचे वाचन'
    },
    image: 'https://i.postimg.cc/3RfL08Hc/temp-Image-N5-TSEG.avif',
    slug: 'science-of-breath-swar-yoga',
    category: 'Education'
  },
  {
    id: '3',
    title: {
      en: 'Healing Through Breath: Swar Yoga for Common Health Issues',
      hi: 'सांस के माध्यम से उपचार: सामान्य स्वास्थ्य समस्याओं के लिए स्वर योग',
      mr: 'श्वासाद्वारे उपचार: सामान्य आरोग्य समस्यांसाठी स्वर योग'
    },
    excerpt: {
      en: 'Learn how specific breathing techniques in Swar Yoga can help address common health concerns like digestive issues, insomnia, stress, and respiratory problems naturally.',
      hi: 'जानें कि स्वर योग में विशिष्ट श्वास तकनीकें पाचन संबंधी समस्याओं को कैसे दूर कर सकती हैं।',
      mr: 'स्वर योगातील विशिष्ट श्वास तंत्रे पचनाच्या समस्या कशा सोडवू शकतात हे जाणून घ्या.'
    },
    author: 'Yogacharya Mohan Kalburgi',
    date: '2024-12-05',
    readTime: {
      en: '12 min read',
      hi: '12 मिनट का पठन',
      mr: '12 मिनिटांचे वाचन'
    },
    image: 'https://i.postimg.cc/vZ4BFXPF/temp-Image-IIb-JFp.avif',
    slug: 'healing-through-breath-swar-yoga',
    category: 'Wellness'
  }
];

export default function BlogPage() {
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [email, setEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeLoading(true);
    setSubscribeMessage('');
    try {
      const response = await fetch('/api/blog/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setEmail('');
        setSubscribeMessage('✓ Thank you for subscribing!');
        setTimeout(() => setSubscribeMessage(''), 3000);
      } else {
        setSubscribeMessage('Please try again');
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      setSubscribeMessage('Connection error. Please try again.');
    } finally {
      setSubscribeLoading(false);
    }
  };

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title[language].toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt[language].toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = blogPosts.find(p => p.featured);
  const otherPosts = filteredPosts.filter(p => !p.featured);
  const categories = Array.from(new Set(blogPosts.map(p => p.category)));

  const translations = {
    pageTitle: { en: 'Wellness Insights', hi: 'कल्याण अंतर्दृष्टि', mr: 'कल्याण अंतर्दृष्टि' },
    pageSubtitle: { en: 'Explore ancient yoga wisdom meets modern science', hi: 'प्राचीन योग ज्ञान और आधुनिक विज्ञान की खोज करें', mr: 'प्राचीन योग ज्ञान आणि आधुनिक विज्ञानाचा शोध घ्या' },
    pageDesc: { en: 'Discover transformative yoga practices, breathing techniques, and wellness strategies from our expert instructors. Join thousands of practitioners worldwide on their journey to better health and inner peace.', hi: 'हमारे विशेषज्ञ प्रशिक्षकों से योग अभ्यास, श्वास तकनीकें और कल्याण कौशल की खोज करें।', mr: 'आमच्या तज्ञ प्रशिक्षकांकडून योग अभ्यास, श्वास तंत्र आणि कल्याण कौशलाचा शोध घ्या।' },
    search: { en: 'Search articles...', hi: 'लेख खोजें...', mr: 'लेख शोधा...' },
    categories: { en: 'Categories', hi: 'श्रेणियाँ', mr: 'श्रेणी' },
    allCategories: { en: 'All Articles', hi: 'सभी लेख', mr: 'सर्व लेख' },
    featured: { en: 'Featured Article', hi: 'विशेष लेख', mr: 'विशेष लेख' },
    readMore: { en: 'Read Full Article', hi: 'पूरा लेख पढ़ें', mr: 'पूरा लेख वाचा' },
    latestArticles: { en: 'Latest Articles', hi: 'नवीनतम लेख', mr: 'नवीनतम लेख' },
    newsletter: { en: 'Stay Connected', hi: 'जुड़े रहें', mr: 'जुड़े रहें' },
    newsDescription: { en: 'Get the latest yoga practices, wellness tips, and exclusive insights directly in your inbox. Be part of our global wellness community.', hi: 'नवीनतम योग अभ्यास, कल्याण सुझाव और विशेष अंतर्दृष्टि सीधे अपने इनबॉक्स में पाएं।', mr: 'सर्वशेष योग अभ्यास, कल्याण सुझाव आणि विशेष अंतर्दृष्टि सरकस आपल्या इनबॉक्समध्ये मिळवा।' },
    emailPlaceholder: { en: 'Enter your email address', hi: 'अपना ईमेल पता दर्ज करें', mr: 'तुमचा ईमेल पता प्रविष्ट करा' },
    subscribe: { en: 'Subscribe Now', hi: 'अभी सदस्यता लें', mr: 'आता सदस्यता घ्या' },
    globalReach: { en: 'Global Wellness Community', hi: 'वैश्विक कल्याण समुदाय', mr: 'जागतिक कल्याण समुदाय' }
  };

  return (
    <>
      <Navigation />
      <main className={`min-h-screen bg-swar-bg ${language === 'hi' || language === 'mr' ? 'devanagari' : ''}`}>
        {/* Dark Glossy Hero Section */}
        <section className="relative py-10 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' }}>
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          {/* Subtle glow effects */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
          
          <div className="relative max-w-7xl mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              {/* Language Selector - Dark Theme */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 p-1.5 bg-gray-800/80 border border-gray-700 rounded-full">
                  {(['en', 'hi', 'mr'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-6 py-2 rounded-full font-bold transition-all duration-300 text-sm ${
                        language === lang
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-transparent text-gray-400 hover:text-green-400'
                      }`}
                    >
                      {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
                    </button>
                  ))}
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-green-500">
                {translations.pageTitle[language.split('-')[0] as 'en' | 'hi' | 'mr'] || translations.pageTitle['en']}
              </h1>
              <p className="text-base md:text-lg text-gray-400 mb-4 leading-relaxed">
                {translations.pageSubtitle[language.split('-')[0] as 'en' | 'hi' | 'mr'] || translations.pageSubtitle['en']}
              </p>

              {/* Search - Dark Theme */}
              <div className="max-w-md mx-auto relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <Search className="text-green-500" size={20} />
                </div>
                <input
                  type="text"
                  placeholder={translations.search[language]}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-5 py-3 rounded-full text-white placeholder-gray-500 bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-700"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filter Section */}
        <section className="py-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                  !selectedCategory
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-green-50 border border-gray-200'
                }`}
              >
                {translations.allCategories[language]}
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-green-50 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Article - Compact */}
        {featuredPost && (
          <section className="py-10 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="animate-pulse w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-600 font-semibold text-sm">{translations.featured[language]}</span>
                </div>
                <Link href="#all-articles" className="text-gray-500 hover:text-green-600 transition-colors flex items-center gap-1 text-sm">
                  View All <ArrowRight size={14} />
                </Link>
              </div>

              <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Image Side */}
                  <div className="relative h-64 lg:h-auto overflow-hidden">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title[language]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {featuredPost.category}
                      </span>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="p-6 lg:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                      <Clock size={14} />
                      <span>{featuredPost.readTime[language]}</span>
                      <span>•</span>
                      <span>{new Date(featuredPost.date).toLocaleDateString(language === 'en' ? 'en-US' : 'hi-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                      {featuredPost.title[language]}
                    </h2>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                      {featuredPost.excerpt[language]}
                    </p>

                    <div className="flex items-center justify-between">
                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg transition-colors font-medium text-sm"
                      >
                        {translations.readMore[language]}
                        <ArrowRight size={16} />
                      </Link>
                      <span className="text-xs text-gray-500">{featuredPost.author}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Articles Grid - Compact */}
        {otherPosts.length > 0 && (
          <section id="all-articles" className="py-12 px-4 bg-swar-bg/30">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-swar-text">
                    {translations.latestArticles[language]}
                  </h3>
                </div>
                <span className="text-swar-text-tertiary text-sm">{filteredPosts.length} articles</span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherPosts.map(post => (
                  <article
                    key={post.id}
                    className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:-translate-y-1"
                  >
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title[language]}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Category Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-white/90 backdrop-blur text-green-600 px-3 py-1 rounded-full text-xs font-semibold">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(post.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN', { month: 'short', day: 'numeric' })}
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {post.readTime[language]}
                        </div>
                      </div>

                      <h2 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                        {post.title[language]}
                      </h2>

                      <p className="text-gray-600 text-sm leading-relaxed mb-3 flex-1 line-clamp-2">
                        {post.excerpt[language]}
                      </p>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        {translations.readMore[language]}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {otherPosts.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[3rem] border border-swar-primary/5 shadow-sm">
                  <MessageSquare size={56} className="mx-auto text-swar-primary/20 mb-6" />
                  <p className="text-swar-text-tertiary text-xl font-medium">
                    {language === 'en' ? 'No articles found.' : language === 'hi' ? 'कोई लेख नहीं मिला।' : 'कोणत्याही लेख सापडले नाही.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Newsletter Section - Standardized with About Join section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-swar-primary to-swar-primary-hover p-12 md:p-20 text-center text-white shadow-2xl">
              {/* Shapes for background aesthetic */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>

              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{translations.newsletter[language]}</h2>
                <p className="text-xl md:text-2xl mb-12 text-swar-primary-light font-light leading-relaxed">
                  {translations.newsDescription[language]}
                </p>

                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={translations.emailPlaceholder[language]}
                    className="flex-1 px-8 py-5 rounded-2xl text-swar-text bg-white border-none focus:ring-4 focus:ring-white/20 shadow-xl font-bold text-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={subscribeLoading}
                    className="bg-swar-accent hover:bg-swar-accent-hover disabled:bg-gray-400 text-white px-10 py-5 rounded-2xl transition-all duration-300 font-extrabold shadow-xl hover:shadow-2xl whitespace-nowrap transform hover:-translate-y-1 active:scale-95 disabled:scale-100 uppercase tracking-widest text-sm"
                  >
                    {subscribeLoading ? '...' : translations.subscribe[language]}
                  </button>
                </form>

                {subscribeMessage && (
                  <div className={`mt-6 text-center text-lg font-bold ${subscribeMessage.includes('✓') ? 'text-green-300' : 'text-red-300'}`}>
                    {subscribeMessage}
                  </div>
                )}

                <p className="text-center text-sm text-swar-primary-light mt-8 opacity-80">
                  {language === 'en' ? 'Join over 10,000+ wellness enthusiasts worldwide' : language === 'hi' ? '10,000+ कल्याण उत्साही लोगों के साथ जुड़ें' : '10,000+ कल्याण उत्साही लोगांसह जोडा'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
