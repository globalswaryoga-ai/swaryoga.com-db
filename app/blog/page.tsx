'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { User, Calendar, ArrowRight, Search, Tag } from 'lucide-react';

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

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/blog/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setEmail('');
      alert('Thank you for subscribing!');
    } catch (error) {
      console.error('Newsletter error:', error);
    }
  };

  const filteredPosts = blogPosts.filter(post =>
    post.title[language].toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt[language].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredPost = blogPosts.find(p => p.featured);
  const otherPosts = filteredPosts.filter(p => !p.featured);

  const translations = {
    pageTitle: { en: 'Swar Yoga Blog', hi: 'स्वर योग ब्लॉग', mr: 'स्वर योग ब्लॉग' },
    pageSubtitle: { en: 'Wellness insights and yoga wisdom', hi: 'कल्याण अंतर्दृष्टि और योग ज्ञान', mr: 'कल्याण अंतर्दृष्टि आणि योग ज्ञान' },
    search: { en: 'Search articles...', hi: 'लेख खोजें...', mr: 'लेख शोधा...' },
    categories: { en: 'Categories', hi: 'श्रेणियाँ', mr: 'श्रेणी' },
    featured: { en: 'Featured Article', hi: 'विशेष लेख', mr: 'विशेष लेख' },
    readMore: { en: 'Read Full Article', hi: 'पूरा लेख पढ़ें', mr: 'पूरा लेख वाचा' },
    related: { en: 'More Articles', hi: 'अन्य लेख', mr: 'इतर लेख' },
    newsletter: { en: 'Subscribe to Our Newsletter', hi: 'हमारे न्यूजलेटर के लिए सदस्यता लें', mr: 'आमच्या न्यूजलेटरची सदस्यता घ्या' },
    newsDescription: { en: 'Get the latest yoga tips, wellness articles, and exclusive offers delivered to your inbox.', hi: 'नवीनतम योग सुझाव, कल्याण लेख और विशेष ऑफर आपके इनबॉक्स में पाएं।', mr: 'सर्वशेष योग टिप्स, कल्याण लेख आणि विशेष ऑफर आपल्या इनबॉक्समध्ये मिळवा।' },
    emailPlaceholder: { en: 'Your email address', hi: 'आपका ईमेल पता', mr: 'तुमचा ईमेल पता' },
    subscribe: { en: 'Subscribe', hi: 'सदस्यता लें', mr: 'सदस्यता घ्या' }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16 px-4">
          <div className="container mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{translations.pageTitle[language]}</h1>
            <p className="text-lg text-swar-primary-light max-w-2xl">{translations.pageSubtitle[language]}</p>

            {/* Language Selector */}
            <div className="flex gap-2 mt-6">
              {(['en', 'hi', 'mr'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    language === lang
                      ? 'bg-white text-swar-primary'
                      : 'bg-swar-primary-light0 hover:bg-swar-accent text-white'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="bg-swar-bg py-8 px-4 sticky top-20 z-10">
          <div className="container mx-auto">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-3 text-swar-text-secondary" size={20} />
              <input
                type="text"
                placeholder={translations.search[language]}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>
        </section>

        {/* Featured Article */}
        {featuredPost && (
          <section className="py-12 px-4">
            <div className="container mx-auto">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="h-80 md:h-auto">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title[language]}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-between">
                    <div className="mb-4 inline-block w-fit">
                      <span className="bg-swar-primary-light text-swar-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <Tag size={16} />
                        {translations.featured[language]}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-swar-text mb-4">
                        {featuredPost.title[language]}
                      </h2>
                      <p className="text-swar-text-secondary text-lg leading-relaxed mb-6">
                        {featuredPost.excerpt[language]}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-swar-text-secondary mb-6">
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          <span>{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{new Date(featuredPost.date).toLocaleDateString()}</span>
                        </div>
                        <span className="text-swar-primary font-medium">{featuredPost.readTime[language]}</span>
                      </div>
                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-2 bg-swar-primary hover:bg-swar-primary text-white px-6 py-3 rounded-lg transition font-medium"
                      >
                        {translations.readMore[language]}
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Articles Grid */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <h3 className="text-3xl font-bold text-swar-text mb-8">{translations.related[language]}</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {otherPosts.map(post => (
                <article key={post.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition flex flex-col">
                  <div className="relative h-48 overflow-hidden bg-swar-primary-light">
                    <img
                      src={post.image}
                      alt={post.title[language]}
                      className="w-full h-full object-cover hover:scale-105 transition"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-swar-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="text-xl font-bold text-swar-text mb-3 line-clamp-2">
                      {post.title[language]}
                    </h2>

                    <p className="text-swar-text-secondary mb-4 flex-1 text-sm leading-relaxed">
                      {post.excerpt[language]}
                    </p>

                    <div className="mt-auto">
                      <div className="flex items-center text-sm text-swar-text-secondary mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          <span>{post.author}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{new Date(post.date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center text-swar-primary hover:text-swar-primary font-medium transition"
                      >
                        {translations.readMore[language]}
                        <ArrowRight size={16} className="ml-2" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="container mx-auto max-w-2xl text-center">
            <h3 className="text-3xl font-bold mb-4">{translations.newsletter[language]}</h3>
            <p className="text-swar-primary-light mb-8">{translations.newsDescription[language]}</p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={translations.emailPlaceholder[language]}
                className="flex-1 px-4 py-3 rounded-lg text-swar-text focus:outline-none"
                required
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition font-medium whitespace-nowrap"
              >
                {translations.subscribe[language]}
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
