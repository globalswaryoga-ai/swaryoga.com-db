'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

const featuredStories = [
  {
    title: 'Breathing Through the Seasons',
    date: 'December 2025',
    excerpt:
      'A practical guide to tune your pranayama, diet, and rest cycles with the winter solstice energy of India.',
    tag: 'Pranayam',
  },
  {
    title: 'Ayurvedic Reset for Modern Lifestyles',
    date: 'November 2025',
    excerpt:
      'Coach Anjali rewired her morning rituals to resolve burnout. Here is the four-step ritual we gave her.',
    tag: 'Ayurveda',
  },
  {
    title: 'Swar Science: Breath, Sound, and Heart Coherence',
    date: 'October 2025',
    excerpt:
      'How the Swar Yoga research group uses sound baths to drop cortisol levels before deep pranayama.',
    tag: 'Research',
  },
];

const communityNotes = [
  {
    title: 'Community Calendar',
    detail: 'Weekly satsangs, local wellness talks, and charity yoga drives are now live on the Swar Calendar.',
  },
  {
    title: 'Guest Teacher Series',
    detail: 'This month, we welcome Himalayan guru Dr. Ramesh to speak on breath and neuroplasticity.',
  },
  {
    title: 'Student Spotlight',
    detail: 'Meet Shabnam—she transitioned from Delhi city stress to leading our breathing cohorts in Assam.',
  },
];

export default function BlogPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-emerald-700 to-slate-900 text-white pb-16">
          <div className="container mx-auto px-6 py-20">
            <p className="text-sm uppercase tracking-[0.6em] mb-6">Swar Journal</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Real stories from the Swar community</h1>
            <p className="text-lg text-white/80 max-w-3xl leading-relaxed">
              Insights, research updates, and reflections on breath practice, Ayurveda, and conscious living. Follow the blog to stay aligned with the workshop cycles, resort retreats, and life-planner rituals we teach.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16 space-y-12">
          <div className="grid gap-8 md:grid-cols-3">
            {featuredStories.map((story) => (
              <article key={story.title} className="rounded-3xl border border-gray-100 p-6 shadow-lg hover:shadow-2xl transition bg-white">
                <div className="text-sm uppercase tracking-[0.4em] text-emerald-500 font-semibold mb-4">{story.tag}</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">{story.title}</h2>
                <p className="text-sm text-gray-500 mb-3">{story.date}</p>
                <p className="text-gray-600 leading-relaxed mb-6">{story.excerpt}</p>
                <Link href="/blog" className="text-emerald-600 font-semibold text-sm hover:text-emerald-800">
                  Read story →
                </Link>
              </article>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {communityNotes.map((note) => (
              <article key={note.title} className="rounded-3xl bg-gradient-to-br from-emerald-50 to-slate-50 border border-emerald-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{note.title}</h3>
                <p className="text-gray-600">{note.detail}</p>
              </article>
            ))}
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.6em] text-gray-400">Newsletter</p>
            <h3 className="text-3xl font-bold text-gray-900">Stay in the Swar Loop</h3>
            <p className="text-gray-600">
              We publish a curated recap each month with the latest workshops, resort insights, and calendar highlights.
            </p>
            <Link
              href="/signup?redirect=/blog"
              className="inline-flex items-center justify-center bg-emerald-600 text-white rounded-full px-8 py-3 font-semibold text-sm shadow-lg hover:bg-emerald-700 transition"
            >
              Subscribe to Updates
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
