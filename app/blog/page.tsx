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
      <main className="min-h-screen bg-swar-bg">
        {/* NEW: Premium Split Hero Section */}
        <section className="relative pt-32 pb-20 bg-white overflow-hidden">
          {/* Subtle Accent Background */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-swar-primary/5 -skew-x-12 translate-x-1/4 z-0 hidden lg:block" />
          
          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl text-center lg:text-left animate-fade-in-up">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
                  <div className="p-2.5 bg-swar-primary text-white rounded-xl shadow-lg shadow-swar-primary/20">
                    <Globe size={24} />
                  </div>
                  <span className="text-sm font-extrabold tracking-[0.2em] uppercase text-swar-primary">{translations.globalReach[language]}</span>
                </div>
                
                <h1 className="text-6xl md:text-8xl font-black mb-8 text-swar-text tracking-tighter leading-[0.9]">
                  {translations.pageTitle[language.split('-')[0] as 'en' | 'hi' | 'mr'] || translations.pageTitle['en']}
                </h1>
                
                <p className="text-xl md:text-2xl text-swar-text-secondary leading-relaxed mb-10 font-medium">
                  {translations.pageSubtitle[language.split('-')[0] as 'en' | 'hi' | 'mr'] || translations.pageSubtitle['en']}
                </p>

                {/* Reader Stats */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mb-12">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-md">
                         <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="Reader" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="h-10 w-px bg-gray-200 hidden sm:block" />
                  <div>
                    <div className="text-swar-text font-black text-xl">5,240+</div>
                    <div className="text-swar-text-tertiary text-xs uppercase tracking-widest font-bold">Monthly Readers</div>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-start">
                  <div className="flex items-center gap-2 p-1.5 bg-swar-bg border border-swar-primary/10 rounded-[2rem] shadow-inner">
                    {(['en', 'hi', 'mr'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`px-8 py-2.5 rounded-[1.5rem] font-bold transition-all duration-300 text-sm ${
                          language === lang
                            ? 'bg-white text-swar-primary shadow-md scale-105'
                            : 'bg-transparent text-swar-text-secondary hover:text-swar-primary'
                        }`}
                      >
                        {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Side */}
              <div className="relative hidden lg:block animate-fade-in-right">
                <div className="relative z-10 aspect-[4/5] rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rotate-2 hover:rotate-0 transition-transform duration-700 border-8 border-white">
                  <img
                    src="https://images.pexels.com/photos/2908984/pexels-photo-2908984.jpeg"
                    alt="Ancient Wisdom"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                {/* Decorative floating card */}
                <div className="absolute -bottom-10 -left-10 z-20 bg-white p-6 rounded-3xl shadow-2xl border border-swar-primary/10 animate-soft-pulse">
                  <div className="flex items-center gap-4">
                    <div className="bg-swar-accent/20 p-3 rounded-2xl text-swar-accent">
                      <Tag size={28} />
                    </div>
                    <div>
                      <div className="text-swar-text font-black text-lg">New Wisdom</div>
                      <div className="text-swar-text-tertiary text-xs font-bold uppercase tracking-widest">Added Weekly</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEW: Dynamic Command Center (Search & Category) */}
        <section className="relative z-20 px-4 -mt-10 pb-8">
          <div className="container mx-auto max-w-7xl">
            <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] border border-white/50 p-4 md:p-6 animate-fade-in-up">
              <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* Search - Integrated Style */}
                <div className="w-full lg:w-1/3 relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Search className="text-swar-primary transition-transform group-focus-within:scale-110" size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder={translations.search[language]}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-swar-bg/50 border-2 border-transparent focus:border-swar-primary/20 rounded-[2rem] focus:bg-white transition-all text-swar-text font-bold placeholder:text-swar-text-tertiary shadow-inner"
                  />
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block h-10 w-px bg-gray-200" />

                {/* Pill Filters */}
                <div className="flex-1 w-full overflow-x-auto no-scrollbar scroll-smooth">
                  <div className="flex flex-nowrap items-center gap-3 py-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm transition-all whitespace-nowrap ${
                        !selectedCategory
                          ? 'bg-swar-primary text-white shadow-lg shadow-swar-primary/20 scale-105'
                          : 'bg-white text-swar-text-tertiary hover:bg-swar-primary/5 hover:text-swar-primary border border-swar-primary/10'
                      }`}
                    >
                      {translations.allCategories[language]}
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm transition-all whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-swar-primary text-white shadow-lg shadow-swar-primary/20 scale-105'
                            : 'bg-white text-swar-text-tertiary hover:bg-swar-primary/5 hover:text-swar-primary border border-swar-primary/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Article - High Impact */}
        {featuredPost && (
          <section className="py-20 px-4 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-swar-accent/5 rounded-full blur-[100px] -z-10" />
            <div className="container mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <div className="inline-flex items-center gap-3 py-1.5 px-6 rounded-full bg-swar-primary/10 text-swar-primary font-black text-xs mb-4 tracking-[0.25em] uppercase border border-swar-primary/20">
                    <span className="animate-pulse w-2 h-2 rounded-full bg-swar-primary" />
                    {translations.featured[language]}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-swar-text tracking-tight">Today's Highlight</h2>
                </div>
                <div className="hidden md:block">
                  <Link href="#all-articles" className="text-swar-text-tertiary font-bold hover:text-swar-primary transition-colors flex items-center gap-2 uppercase tracking-widest text-xs">
                    View All Insight <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="group relative bg-white rounded-[4rem] overflow-hidden shadow-[0_40px_80px_-24px_rgba(0,0,0,0.12)] border border-swar-primary/5 hover:shadow-[0_48px_96px_-24px_rgba(0,0,0,0.18)] transition-all duration-700">
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Visual Side */}
                  <div className="relative h-[30rem] lg:h-auto overflow-hidden">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title[language]}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-swar-text/60 via-transparent to-transparent opacity-60" />
                    
                    {/* Floating Info */}
                    <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between">
                       <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30">
                          <Clock size={20} className="text-white" />
                          <span className="text-white font-black text-sm uppercase tracking-widest">{featuredPost.readTime[language]}</span>
                       </div>
                    </div>
                  </div>

                  {/* Text Side */}
                  <div className="p-10 lg:p-20 flex flex-col justify-center bg-white relative">
                    <div className="absolute top-0 right-0 p-10 hidden lg:block">
                      <div className="w-20 h-20 border-r-4 border-t-4 border-swar-primary/10 rounded-tr-[2rem]" />
                    </div>

                    <div className="mb-8">
                      <span className="bg-swar-primary text-white px-8 py-3 rounded-2xl text-xs font-black tracking-[0.1em] uppercase shadow-lg shadow-swar-primary/20">
                        {featuredPost.category}
                      </span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-swar-text mb-8 leading-[0.9] tracking-tighter">
                      {featuredPost.title[language]}
                    </h2>

                    <p className="text-xl md:text-2xl text-swar-text-secondary leading-relaxed mb-12 font-medium">
                      {featuredPost.excerpt[language]}
                    </p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-10">
                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="bg-swar-text hover:bg-swar-primary text-white px-12 py-5 rounded-3xl transition-all duration-500 font-black shadow-2xl hover:shadow-swar-primary/30 transform hover:-translate-y-1 active:scale-95 group/btn flex items-center gap-4"
                      >
                        {translations.readMore[language]}
                        <ArrowRight size={22} className="group-hover/btn:translate-x-2 transition-transform" />
                      </Link>

                      <div className="flex items-center gap-4">
                        <img 
                          src="https://i.pravatar.cc/100?img=12" 
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-swar-bg shadow-md" 
                          alt={featuredPost.author} 
                        />
                        <div>
                          <p className="text-swar-text font-black text-sm uppercase mb-0.5">{featuredPost.author}</p>
                          <p className="text-swar-text-tertiary text-xs font-bold">{new Date(featuredPost.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Articles Grid - Enhanced */}
        {otherPosts.length > 0 && (
          <section id="all-articles" className="py-24 px-4 bg-swar-bg/30">
            <div className="container mx-auto max-w-7xl">
              <div className="mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-b border-swar-primary/10 pb-12">
                <div className="max-w-2xl">
                  <span className="text-swar-primary font-black text-xs tracking-[0.3em] uppercase mb-4 block">EXPLORE THE ARCHIVE</span>
                  <h3 className="text-5xl md:text-7xl font-black text-swar-text leading-[0.9] tracking-tighter">
                    {translations.latestArticles[language]}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full border border-swar-primary/20 flex items-center justify-center text-swar-primary">
                    <Search size={20} />
                  </div>
                  <span className="text-swar-text-tertiary font-bold uppercase tracking-widest text-[10px]">Filtering {filteredPosts.length} Insights</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                {otherPosts.map(post => (
                  <article
                    key={post.id}
                    className="group flex flex-col bg-white rounded-[3.5rem] overflow-hidden shadow-sm hover:shadow-[0_64px_96px_-32px_rgba(30,127,67,0.15)] transition-all duration-700 border border-swar-primary/5 hover:-translate-y-4"
                  >
                    {/* Visual Container */}
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title[language]}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-swar-text/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Floating Meta */}
                      <div className="absolute top-8 left-8">
                        <span className="bg-white/95 backdrop-blur-xl text-swar-primary px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-2xl">
                          {post.category}
                        </span>
                      </div>
                      
                      {/* Quick Read Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <div className="bg-white text-swar-text p-5 rounded-full shadow-2xl">
                          <ArrowRight size={24} className="text-swar-primary" />
                        </div>
                      </div>
                    </div>

                    {/* Content Architecture */}
                    <div className="p-10 flex-1 flex flex-col relative">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-swar-text-tertiary uppercase tracking-widest">
                          <Calendar size={14} className="text-swar-primary" />
                          {new Date(post.date).toLocaleDateString(language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'mr-IN', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-swar-primary/30" />
                        <div className="flex items-center gap-2 text-[10px] font-black text-swar-text-tertiary uppercase tracking-widest">
                          <Clock size={14} className="text-swar-primary" />
                          {post.readTime[language]}
                        </div>
                      </div>

                      <h2 className="text-3xl font-black text-swar-text mb-6 line-clamp-2 leading-tight tracking-tight group-hover:text-swar-primary transition-colors duration-500">
                        {post.title[language]}
                      </h2>

                      <p className="text-swar-text-secondary text-lg leading-relaxed mb-10 flex-1 line-clamp-3 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                        {post.excerpt[language]}
                      </p>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center justify-center gap-3 w-full py-5 rounded-[2rem] border-2 border-swar-primary/10 text-swar-primary font-black uppercase tracking-widest text-xs group-hover:bg-swar-primary group-hover:text-white group-hover:border-swar-primary transition-all duration-500"
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
