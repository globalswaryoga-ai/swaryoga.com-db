'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { MapPin, Sparkles, Leaf, Sun, Moon } from 'lucide-react';

const resortHighlights = [
  {
    title: 'Brahmaputra Riverside Retreat',
    description:
      'Exclusive suites overlooking the Brahmaputra river with private plunge pools, handcrafted local furnishings, and nightly mantra blessings.',
    icon: <Sparkles className="w-6 h-6 text-amber-500" />,
  },
  {
    title: 'Holistic Ayurveda Spa',
    description:
      'Authentic panchakarma therapies, pulse diagnosis, and medicated oil massages guided by our Ayurvedic doctors.',
    icon: <Leaf className="w-6 h-6 text-emerald-500" />,
  },
  {
    title: 'Cuisine with Soul',
    description:
      'Kitchari kitchens and sattvic dining with seasonal forest-to-table ingredients curated by Himalayan chefs.',
    icon: <Sun className="w-6 h-6 text-orange-500" />,
  },
  {
    title: 'Stellar Samadhi Nights',
    description:
      'Moonlit forest baths, chanting circles, and guest lectures on Vedic astronomy and pranayama.',
    icon: <Moon className="w-6 h-6 text-sky-400" />,
  },
];

const getawayPackages = [
  {
    name: 'Essence of Swar Retreat',
    duration: '5 nights / 6 days',
    price: '₹48,000 per person',
    focus: 'Four daily practices, breath workshops, and guided river meditations.',
  },
  {
    name: 'Resonance Weekender',
    duration: '3 nights / 4 days',
    price: '₹32,000 per person',
    focus: 'Quick immersion with pranayama labs, aroma floats, and sunrise ukulu sessions.',
  },
  {
    name: 'Swar Immersion Residency',
    duration: '10 nights / 11 days',
    price: '₹88,000 per person',
    focus: 'Daily satsang, Ayurvedic consultations, and expedition to the local sacred groves.',
  },
];

const dailyArtistLines = [
  '05:15 – Sunrise breath circle & Vedic chanting',
  '07:00 – Energizing pranayama with Himalayan guides',
  '10:00 – Ayurveda lunch sabbatical & forest walk',
  '14:00 – Sattvic siesta, restorative nadi therapy, or journaling studio',
  '17:30 – Sunset yantra vinyasa and mantra sound baths',
  '20:00 – Stargazing Samadhi with guest scholars',
];

export default function ResortPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-[#f6f6f5] to-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-60" />
          <div className="relative z-10 container mx-auto px-4 py-24 text-white">
            <p className="uppercase tracking-[0.4em] text-sm text-white/70 mb-4">Resort Sanctuary</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Swar Resort &amp; Retreats
            </h1>
            <p className="text-lg md:text-xl max-w-3xl text-white/90 leading-relaxed mb-8">
              Nestled by the Brahmaputra and framed by misty hills, Swar Resort is an immersive sanctuary where
              Ayurvedic restoration, breath science, and conscious hospitality guide every moment. Each stay is crafted
              with ancestral rituals, organic cuisine, and soul-enriching experiences.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/life-planner" className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-2xl transition">
                Plan Your Stay
              </Link>
              <Link href="/calendar" className="border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition">
                Explore Swar Calendar
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 space-y-12">
          <div className="grid md:grid-cols-2 gap-8">
            {resortHighlights.map((highlight) => (
              <article key={highlight.title} className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition border border-gray-100">
                <div className="flex items-center gap-3 mb-4">{highlight.icon}<h3 className="text-xl font-semibold text-gray-900">{highlight.title}</h3></div>
                <p className="text-gray-600 leading-relaxed">{highlight.description}</p>
              </article>
            ))}
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">The Experience</p>
              <h2 className="text-3xl font-bold text-gray-900">Daily Rhythm at Swar Resort</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Harmonic Schedule</h3>
                <ul className="space-y-3 text-gray-600">
                  {dailyArtistLines.map((line) => (
                    <li key={line} className="flex items-start gap-3">
                      <span className="h-2 w-2 mt-1 rounded-full bg-green-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-teal-400 rounded-3xl p-8 text-white shadow-2xl">
                <h3 className="text-2xl font-semibold mb-3">Why Guests Return</h3>
                <p className="text-gray-200 leading-relaxed">
                  The resort blends Ayurvedic rituals, conscious cuisine, and science-backed breath work. Guests leave with revitalized
                  nervous systems, clearer minds, and a practical roadmap for sustaining Swar’s daily practices at home.
                </p>
                <p className="mt-4 font-semibold text-sm uppercase tracking-[0.4em]">Only 32 guests per season</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">Signature Journeys</p>
                <h2 className="text-3xl font-bold text-gray-900">Getaway Packages</h2>
              </div>
              <div className="text-sm text-green-600 font-semibold">
                Sustainably run • Small groups
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {getawayPackages.map((pkg) => (
                <article key={pkg.name} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-lg hover:-translate-y-1 transition">
                  <div className="text-sm text-gray-500 uppercase tracking-[0.3em] mb-3">{pkg.duration}</div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-gray-600 mb-4">{pkg.focus}</p>
                  <p className="text-lg font-bold text-gray-900 mb-4">{pkg.price}</p>
                  <Link
                    href="/resort"
                    className="inline-flex items-center gap-2 text-green-600 font-semibold"
                  >
                    Reserve your suite
                    <MapPin size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
