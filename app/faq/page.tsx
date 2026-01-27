'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  featured: boolean;
}

// Static FAQs for core questions
const staticFAQs: FAQ[] = [
  {
    _id: 'static-1',
    question: 'What is Swar Yoga?',
    answer: 'Swar Yoga (also spelled Swara Yoga) is an ancient tantric science that studies the breath flow through the nostrils. It teaches how the breath relates to cosmic rhythms, energy channels (nadis), and how to use this knowledge for health, decision-making, and spiritual growth. Unlike regular yoga that focuses on postures, Swar Yoga primarily works with breath awareness and timing.',
    category: 'general',
    featured: true,
  },
  {
    _id: 'static-2',
    question: 'How is Swar Yoga different from Pranayama?',
    answer: 'While both involve breath work, they serve different purposes. Pranayama consists of breathing exercises and techniques to control prana (life force). Swar Yoga is more of a science of observation - understanding which nostril is dominant at any given time and making decisions based on this awareness. Pranayama is a practice you do; Swar Yoga is wisdom you apply throughout the day.',
    category: 'yoga',
    featured: true,
  },
  {
    _id: 'static-3',
    question: 'What are the benefits of practicing Swar Yoga?',
    answer: 'Regular Swar Yoga practice can help with: Better decision-making by understanding optimal timing, Improved health through nostril awareness, Enhanced mental clarity and focus, Better sleep patterns, Stress reduction, Understanding your body\'s natural rhythms, Spiritual development through breath awareness.',
    category: 'health',
    featured: true,
  },
  {
    _id: 'static-4',
    question: 'Do I need prior yoga experience to learn Swar Yoga?',
    answer: 'No prior yoga experience is required! Swar Yoga is suitable for complete beginners. The practice starts with simple breath awareness that anyone can do. Our workshops are designed to guide you step-by-step, whether you\'ve been practicing yoga for years or are completely new to it.',
    category: 'general',
    featured: false,
  },
  {
    _id: 'static-5',
    question: 'What is Ida and Pingala?',
    answer: 'Ida and Pingala are the two main energy channels (nadis) in the yogic subtle body. Ida (left nostril) represents lunar, cooling, calming energy - good for creative and receptive activities. Pingala (right nostril) represents solar, heating, activating energy - good for physical and analytical tasks. Swar Yoga teaches how to work with these energies for optimal living.',
    category: 'yoga',
    featured: true,
  },
  {
    _id: 'static-6',
    question: 'How do I join a workshop?',
    answer: 'You can join our workshops by: 1) Visiting the Workshops page and registering for upcoming sessions, 2) Joining our WhatsApp community for announcements, 3) Following us on social media for live updates. We offer both online and offline workshops in Hindi and English.',
    category: 'general',
    featured: false,
  },
  {
    _id: 'static-7',
    question: 'What is the Life Planner feature?',
    answer: 'The Life Planner is a unique tool based on Swar Yoga principles. It shows you the optimal times for different activities based on nostril dominance and Panchang (Vedic calendar). You can check the best times for important decisions, travel, health practices, and more - all personalized to your timezone.',
    category: 'lifestyle',
    featured: false,
  },
  {
    _id: 'static-8',
    question: 'Are the workshops available online?',
    answer: 'Yes! We offer both online (Zoom) and offline workshops. Online workshops are conducted live with interactive Q&A sessions. You can join from anywhere in the world. Workshop recordings are also available for community members who cannot attend live sessions.',
    category: 'general',
    featured: false,
  },
];

const categories = [
  { id: 'all', name: 'All Questions', icon: '📋' },
  { id: 'general', name: 'General', icon: '💭' },
  { id: 'yoga', name: 'Yoga', icon: '🧘' },
  { id: 'pranayama', name: 'Pranayama', icon: '🌬️' },
  { id: 'health', name: 'Health', icon: '❤️' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🌿' },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>(staticFAQs);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunityFAQs();
  }, []);

  async function fetchCommunityFAQs() {
    try {
      const res = await fetch('/api/community/questions?status=answered&limit=50');
      const data = await res.json();
      
      if (data.success && data.questions?.length > 0) {
        // Convert community questions to FAQ format
        const communityFAQs: FAQ[] = data.questions.map((q: any) => ({
          _id: q._id,
          question: q.question,
          answer: q.answer,
          category: q.category || 'general',
          featured: q.featured || false,
        }));
        
        // Merge with static FAQs (static ones first)
        setFaqs([...staticFAQs, ...communityFAQs]);
      }
    } catch (error) {
      console.error('Failed to fetch community FAQs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort: featured first, then by question
  const sortedFAQs = [...filteredFAQs].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  // Prepare FAQs for schema
  const schemaFAQs = sortedFAQs.slice(0, 20).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Schema.org JSON-LD */}
      <FAQJsonLd questions={schemaFAQs} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://swaryoga.com' },
          { name: 'FAQ', url: 'https://swaryoga.com/faq' },
        ]}
      />

      {/* Header */}
      <div className="bg-emerald-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-emerald-100 text-lg">
            Find answers to common questions about Swar Yoga, pranayama, and our workshops
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === c.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 border border-gray-200'
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* FAQs */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">🌀</div>
            <p className="text-gray-500 mt-2">Loading questions...</p>
          </div>
        ) : sortedFAQs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <div className="text-4xl mb-2">🤔</div>
            <p className="text-gray-500">No questions found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFAQs.map((faq) => (
              <div
                key={faq._id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  faq.featured ? 'border-amber-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq._id ? null : faq._id)}
                  className="w-full p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {faq.featured && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                          ⭐ Popular
                        </span>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 mt-1">{faq.question}</h3>
                    </div>
                    <div className={`text-2xl text-gray-400 transition-transform ${expandedId === faq._id ? 'rotate-45' : ''}`}>
                      +
                    </div>
                  </div>
                </button>
                
                {expandedId === faq._id && (
                  <div className="px-5 pb-5 border-t border-gray-100 bg-emerald-50/50">
                    <div className="pt-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {categories.find(c => c.id === faq.category)?.icon} {faq.category}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-emerald-100 mb-6">Ask our community or contact us directly</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/community/questions"
              className="px-6 py-3 bg-white text-emerald-700 rounded-full font-medium hover:bg-emerald-50 transition-colors"
            >
              Ask a Question
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 bg-emerald-700 text-white rounded-full font-medium hover:bg-emerald-800 transition-colors border border-emerald-500"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
