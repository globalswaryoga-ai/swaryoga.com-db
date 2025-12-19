'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { User, Calendar, ArrowRight, Search, Tag, Clock, MessageSquare, Globe } from 'lucide-react';

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
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Enhanced Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-swar-primary via-emerald-600 to-teal-700 text-white pt-24 pb-20 px-4">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl -ml-40 -mb-40"></div>
          
          <div className="container mx-auto relative z-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4 text-swar-primary-light">
                <Globe size={20} />
                <span className="text-sm font-semibold tracking-widest uppercase">{translations.globalReach[language]}</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                {translations.pageTitle[language]}
              </h1>
              
              <p className="text-xl text-swar-primary-light mb-8 leading-relaxed max-w-2xl">
                {translations.pageSubtitle[language]}
              </p>

              <p className="text-base text-swar-primary-light opacity-95 max-w-2xl leading-relaxed mb-8">
                {translations.pageDesc[language]}
              </p>

              {/* Language Selector */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-swar-primary-light">Read in:</span>
                {(['en', 'hi', 'mr'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-5 py-2 rounded-full font-semibold transition-all duration-300 ${
                      language === lang
                        ? 'bg-white text-swar-primary shadow-lg scale-105'
                        : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white border border-white border-opacity-30'
                    }`}
                  >
                    {lang === 'en' ? '🇬🇧 English' : lang === 'hi' ? '🇮🇳 हिंदी' : '🇮🇳 मराठी'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Section */}
        <section className="relative z-20 px-4 -mt-8 pb-8">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder={translations.search[language]}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent bg-white shadow-lg transition"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="md:col-span-1">
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent bg-white shadow-lg transition font-medium"
                >
                  <option value="">{translations.allCategories[language]}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Article - Enhanced */}
        {featuredPost && (
          <section className="py-16 px-4">
            <div className="container mx-auto">
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 text-swar-primary font-bold text-sm tracking-widest uppercase">
                  <Tag size={16} />
                  {translations.featured[language]}
                </span>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-100">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="relative h-96 lg:h-full overflow-hidden bg-gradient-to-br from-swar-primary-light to-slate-200">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title[language]}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-20"></div>
                  </div>

                  {/* Content */}
                  <div className="p-8 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50">
                    <div>
                      <div className="mb-6 inline-block">
                        <span className="bg-gradient-to-r from-swar-primary to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                          {featuredPost.category}
                        </span>
                      </div>

                      <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
                        {featuredPost.title[language]}
                      </h2>

                      <p className="text-slate-600 text-lg leading-relaxed mb-8">
                        {featuredPost.excerpt[language]}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-6 text-sm text-slate-600 mb-8 pb-8 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-swar-primary to-emerald-600"></div>
                          <span className="font-semibold text-slate-900">{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-swar-primary" />
                          <span>{new Date(featuredPost.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={18} className="text-swar-primary" />
                          <span>{featuredPost.readTime[language]}</span>
                        </div>
                      </div>

                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-swar-primary to-emerald-600 hover:from-swar-primary hover:to-teal-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {translations.readMore[language]}
                        <ArrowRight size={20} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Articles Grid - Enhanced */}
        {otherPosts.length > 0 && (
          <section className="py-20 px-4">
            <div className="container mx-auto">
              <div className="mb-12">
                <h3 className="text-4xl font-bold text-slate-900 mb-3">{translations.latestArticles[language]}</h3>
                <div className="w-16 h-1 bg-gradient-to-r from-swar-primary to-emerald-600 rounded-full"></div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherPosts.map(post => (
                  <article
                    key={post.id}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 flex flex-col border border-slate-100 hover:border-swar-primary hover:-translate-y-2"
                  >
                    {/* Image Container */}
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-swar-primary-light to-slate-200">
                      <img
                        src={post.image}
                        alt={post.title[language]}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 hover:opacity-30 transition-opacity duration-500"></div>
                      
                      {/* Category Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="bg-white text-swar-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col bg-gradient-to-b from-white to-slate-50">
                      <h2 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-tight">
                        {post.title[language]}
                      </h2>

                      <p className="text-slate-600 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                        {post.excerpt[language]}
                      </p>

                      {/* Meta Info */}
                      <div className="mt-auto">
                        <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-200">
                          <div className="flex items-center gap-1">
                            <User size={14} className="text-swar-primary" />
                            <span className="font-medium">{post.author.split(' ')[0]}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-swar-primary" />
                            <span>{new Date(post.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN', { year: 'numeric', month: 'short' })}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-swar-primary" />
                            <span>{post.readTime[language]}</span>
                          </div>
                        </div>

                        <Link
                          href={`/blog/${post.slug}`}
                          className="inline-flex items-center text-swar-primary hover:text-emerald-700 font-bold transition-colors duration-300 group"
                        >
                          {translations.readMore[language]}
                          <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {otherPosts.length === 0 && (
                <div className="text-center py-16">
                  <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg">
                    {language === 'en' ? 'No articles found. Try adjusting your search.' : language === 'hi' ? 'कोई लेख नहीं मिला।' : 'कोणत्याही लेख सापडले नाही.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Newsletter Section - Enhanced */}
        <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-swar-primary to-emerald-700 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl -ml-40 -mb-40"></div>

          <div className="container mx-auto max-w-2xl relative z-10">
            <div className="text-center mb-8">
              <h3 className="text-4xl md:text-5xl font-bold mb-4">{translations.newsletter[language]}</h3>
              <p className="text-lg text-slate-100 leading-relaxed">{translations.newsDescription[language]}</p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={translations.emailPlaceholder[language]}
                className="flex-1 px-6 py-4 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-white shadow-lg transition font-medium"
                required
              />
              <button
                type="submit"
                disabled={subscribeLoading}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-400 text-white px-8 py-4 rounded-xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl whitespace-nowrap transform hover:scale-105 disabled:scale-100"
              >
                {subscribeLoading ? '...' : translations.subscribe[language]}
              </button>
            </form>

            {subscribeMessage && (
              <div className={`mt-4 text-center text-sm font-semibold ${subscribeMessage.includes('✓') ? 'text-green-300' : 'text-red-300'}`}>
                {subscribeMessage}
              </div>
            )}

            <p className="text-center text-sm text-slate-100 mt-6 opacity-80">
              {language === 'en' ? 'Join over 10,000+ wellness enthusiasts worldwide' : language === 'hi' ? '10,000+ कल्याण उत्साही लोगों के साथ जुड़ें' : '10,000+ कल्याण उत्साही लोगांसह जोडा'}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
