'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { User, Calendar, ArrowRight } from 'lucide-react';

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
      hi: 'जानें कैसे स्वर योग बेहतर स्वास्थ्य और कल्याण के लिए सर्वोत्तम नींद की स्थिति के बारे में अंतर्दृष्टि प्रदान करता है। सांस के प्राचीन विज्ञान और आपकी नींद की गुणवत्ता पर इसके गहरे प्रभाव के बारे में जानें।',
      mr: 'स्वर योग कसे उत्तम आरोग्य आणि कल्याणासाठी झोपेच्या स्थितीबद्दल अंतर्दृष्टी देतो हे शोधा. श्वासाचे प्राचीन विज्ञान आणि तुमच्या झोपेच्या गुणवत्तेवर त्याचा खोल प्रभाव जाणून घ्या.'
    },
    author: 'Yogacharya Mohan Kalburgi',
    date: '2024-04-21',
    readTime: {
      en: '8 min read',
      hi: '8 मिनट का पठन',
      mr: '8 मिनिटांचे वाचन'
    },
    image: 'https://i.postimg.cc/KzWbNy21/temp-Imagep-Ji-Dk-Y.avif',
    slug: 'sleep-postures-swar-yoga',
    category: 'Health'
  },
  {
    id: '2',
    title: {
      en: 'The Science of Breath: Understanding Swar Yoga Fundamentals',
      hi: 'श्वास का विज्ञान: स्वर योग के मूल सिद्धांतों को समझना',
      mr: 'श्वासाचे विज्ञान: स्वर योगाच्या मूलभूत तत्त्वांचे आकलन'
    },
    excerpt: {
      en: 'Explore the foundational principles of Swar Yoga and how the science of breath connects to every aspect of your physical and mental wellbeing. Learn practical techniques to harmonize your breath.',
      hi: 'स्वर योग के मूलभूत सिद्धांतों और श्वास का विज्ञान आपके शारीरिक और मानसिक कल्याण के हर पहलू से कैसे जुड़ा है, इसका पता लगाएं। अपने श्वास को सामंजस्यपूर्ण बनाने के लिए व्यावहारिक तकनीकें सीखें।',
      mr: 'स्वर योगाच्या मूलभूत तत्त्वांचा शोध घ्या आणि श्वासाचे विज्ञान तुमच्या शारीरिक आणि मानसिक कल्याणाच्या प्रत्येक पैलूशी कसे जोडलेले आहे हे जाणून घ्या. तुमच्या श्वासाचा समतोल राखण्यासाठी व्यावहारिक तंत्रे शिका.'
    },
    author: 'Yogacharya Mohan Kalburgi',
    date: '2024-04-15',
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
      en: 'Learn how specific breathing techniques in Swar Yoga can help address common health concerns like digestive issues, insomnia, stress, and respiratory problems naturally and effectively.',
      hi: 'जानें कि स्वर योग में विशिष्ट श्वास तकनीकें पाचन संबंधी समस्याओं, अनिद्रा, तनाव और श्वसन संबंधी समस्याओं जैसी सामान्य स्वास्थ्य चिंताओं को प्राकृतिक और प्रभावी ढंग से कैसे दूर कर सकती हैं।',
      mr: 'स्वर योगातील विशिष्ट श्वास तंत्रे पचनाच्या समस्या, अनिद्रा, ताण आणि श्वसनाच्या समस्यांसारख्या सामान्य आरोग्य समस्या नैसर्गिकरित्या आणि प्रभावीपणे कशा सोडवू शकतात हे जाणून घ्या.'
    },
    author: 'Yogacharya Mohan Kalburgi',
    date: '2024-04-10',
    readTime: {
      en: '12 min read',
      hi: '12 मिनट का पठन',
      mr: '12 मिनिटांचे वाचन'
    },
    image: 'https://i.postimg.cc/vZ4BFXPF/temp-Image-IIb-JFp.avif',
    slug: 'healing-through-breath-swar-yoga',
    category: 'Health'
  }
];

const categories = ['All', 'Health', 'Education', 'Lifestyle', 'Spiritual'];

const translations = {
  pageTitle: {
    en: 'Yoga & Wellness Blog',
    hi: 'योग और स्वास्थ्य ब्लॉग',
    mr: 'योग आणि आरोग्य ब्लॉग'
  },
  readFullArticle: {
    en: 'Read Full Article',
    hi: 'पूरा लेख पढ़ें',
    mr: 'संपूर्ण लेख वाचा'
  },
  welcomeTitle: {
    en: 'Welcome to Our Wellness Blog',
    hi: 'हमारे स्वास्थ्य ब्लॉग में आपका स्वागत है',
    mr: 'आमच्या आरोग्य ब्लॉगमध्ये आपले स्वागत आहे'
  },
  welcomeText: {
    en: 'Dive deep into the ancient wisdom of Swar Yoga and discover practical insights for modern living. Our blog features authentic teachings from Yogacharya Mohan Kalburgi, combining traditional knowledge with contemporary wellness practices to help you achieve optimal health and inner harmony.',
    hi: 'स्वर योग के प्राचीन ज्ञान में गहराई से उतरें और आधुनिक जीवन के लिए व्यावहारिक अंतर्दृष्टि प्राप्त करें। हमारा ब्लॉग योगाचार्य मोहन कालबुर्गी के प्रामाणिक शिक्षाओं को प्रस्तुत करता है, जो आपको इष्टतम स्वास्थ्य और आंतरिक सद्भाव प्राप्त करने में मदद करने के लिए पारंपरिक ज्ञान को समकालीन स्वास्थ्य प्रथाओं के साथ जोड़ता है।',
    mr: 'स्वर योगाच्या प्राचीन ज्ञानात खोलवर जा आणि आधुनिक जीवनासाठी व्यावहारिक अंतर्दृष्टी शोधा. आमचा ब्लॉग योगाचार्य मोहन कालबुर्गी यांच्या प्रामाणिक शिकवणी सादर करतो, जे तुम्हाला उत्तम आरोग्य आणि अंतर्गत सुसंवाद मिळवण्यास मदत करण्यासाठी पारंपारिक ज्ञान आणि समकालीन आरोग्य पद्धतींचे संयोजन करतात.'
  },
  comingSoonTitle: {
    en: 'More Articles Coming Soon',
    hi: 'जल्द ही और अधिक लेख आ रहे हैं',
    mr: 'लवकरच अधिक लेख येत आहेत'
  },
  comingSoonText: {
    en: "We're working on bringing you more insightful articles about yoga, meditation, breathing techniques, and holistic wellness. Stay tuned for regular updates from our experienced practitioners.",
    hi: 'हम आपके लिए योग, ध्यान, श्वास तकनीक और समग्र स्वास्थ्य के बारे में अधिक अंतर्दृष्टिपूर्ण लेख लाने पर काम कर रहे हैं। हमारे अनुभवी अभ्यासकर्ताओं से नियमित अपडेट के लिए बने रहें।',
    mr: 'आम्ही तुमच्यासाठी योग, ध्यान, श्वास तंत्र आणि सर्वांगीण आरोग्याबद्दल अधिक अंतर्दृष्टीपूर्ण लेख आणण्यासाठी कार्यरत आहोत. आमच्या अनुभवी व्यावसायिकांकडून नियमित अपडेट्ससाठी वाट पाहत रहा.'
  },
  exploreWorkshops: {
    en: 'Explore Our Workshops',
    hi: 'हमारे वर्कशॉप्स देखें',
    mr: 'आमचे वर्कशॉप एक्सप्लोर करा'
  },
  subscribeUpdates: {
    en: 'Subscribe for Updates',
    hi: 'अपडेट के लिए सदस्यता लें',
    mr: 'अपडेट्ससाठी सबस्क्राइब करा'
  },
  newsletterTitle: {
    en: 'Stay Updated with Swar Yoga',
    hi: 'स्वर योग के साथ अपडेट रहें',
    mr: 'स्वर योगासह अपडेट रहा'
  },
  newsletterText: {
    en: 'Get the latest yoga tips, wellness insights, and workshop updates delivered directly to your inbox.',
    hi: 'नवीनतम योग टिप्स, स्वास्थ्य अंतर्दृष्टि और वर्कशॉप अपडेट सीधे अपने इनबॉक्स में प्राप्त करें।',
    mr: 'नवीनतम योग टिप्स, आरोग्य अंतर्दृष्टी आणि वर्कशॉप अपडेट्स थेट तुमच्या इनबॉक्समध्ये मिळवा.'
  },
  emailPlaceholder: {
    en: 'Enter your email',
    hi: 'अपना ईमेल दर्ज करें',
    mr: 'तुमचा ईमेल प्रविष्ट करा'
  },
  subscribe: {
    en: 'Subscribe',
    hi: 'सदस्यता लें',
    mr: 'सबस्क्राइब करा'
  }
};

export default function BlogPage() {
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [email, setEmail] = useState('');

  const filteredPosts = selectedCategory === 'All'
    ? blogPosts
    : blogPosts.filter(post => post.category === selectedCategory);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(
      language === 'en' ? 'en-US' :
        language === 'hi' ? 'hi-IN' : 'mr-IN',
      options
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Health':
        return 'bg-green-100 text-green-800';
      case 'Education':
        return 'bg-blue-100 text-blue-800';
      case 'Lifestyle':
        return 'bg-orange-100 text-orange-800';
      case 'Spiritual':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageText = (lang: 'en' | 'hi' | 'mr') => {
    switch (lang) {
      case 'en': return 'English';
      case 'hi': return 'हिंदी';
      case 'mr': return 'मराठी';
      default: return 'English';
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/blog/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setEmail('');
        alert(language === 'en' ? 'Subscribed successfully!' : language === 'hi' ? 'सफलतापूर्वक सदस्यता लें!' : 'यशस्वीरित्या सबस्क्राइब करा!');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
    }
  };

  return (
    <>
      <Navigation />
      <main className="pt-16 min-h-screen bg-gradient-to-b from-[#f6f6f5] to-white">
        {/* Hero Section */}
        <section className="relative h-96 bg-gradient-to-r from-green-600 to-blue-600 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg')] bg-cover bg-center opacity-40" />
          <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-white text-center">
            <h1 className="text-5xl font-bold mb-4">{translations.pageTitle[language]}</h1>
            <p className="text-xl text-white/90">Discover wisdom, insights, and practical yoga teachings</p>
          </div>
        </section>

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
          <div className="mb-12">
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

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full hover:shadow-xl transition"
              >
                <div className="relative h-48 w-full">
                  <img
                    src={post.image}
                    alt={post.title[language]}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                    {post.title[language]}
                  </h2>

                  <p className="text-gray-600 mb-4 flex-1 text-sm leading-relaxed">
                    {post.excerpt[language]}
                  </p>

                  <div className="mt-auto">
                    <div className="flex items-center text-sm text-gray-500 mb-4 flex-wrap gap-2">
                      <div className="flex items-center">
                        <User size={16} className="mr-1" />
                        <span>{post.author}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-1" />
                        <span>{formatDate(post.date)}</span>
                      </div>
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition"
                    >
                      {translations.readFullArticle[language]}
                      <ArrowRight size={16} className="ml-2" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* About This Blog */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{translations.welcomeTitle[language]}</h3>
            <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {translations.welcomeText[language]}
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="text-center py-12 bg-white rounded-lg shadow-md mb-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">{translations.comingSoonTitle[language]}</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              {translations.comingSoonText[language]}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/workshops"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                {translations.exploreWorkshops[language]}
              </Link>
              <Link
                href="/contact"
                className="border border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                {translations.subscribeUpdates[language]}
              </Link>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="bg-green-600 rounded-lg p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">{translations.newsletterTitle[language]}</h3>
            <p className="mb-6 max-w-2xl mx-auto">
              {translations.newsletterText[language]}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={translations.emailPlaceholder[language]}
                className="flex-1 px-4 py-2 rounded-l-lg text-gray-800 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-r-lg transition-colors font-medium"
              >
                {translations.subscribe[language]}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
