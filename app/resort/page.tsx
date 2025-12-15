'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { MapPin, Sparkles, Leaf, Sun, Moon, X, Plus, Minus } from 'lucide-react';

const ROOM_TYPES = {
  'Deluxe Garden View': 3500,
  'Traditional Bamboo House': 4500,
  'Premium Mountain View': 6500,
};

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

const roomTypes = [
  {
    name: 'Deluxe Garden View',
    price: 3500,
    description: 'Comfortable room with garden views, perfect for solo travelers and couples.',
    amenities: ['Private Garden', 'AC', 'Hot Water', 'WiFi'],
  },
  {
    name: 'Traditional Bamboo House',
    price: 4500,
    description: 'Eco-friendly bamboo construction with traditional Himalayan architecture.',
    amenities: ['Bamboo Construction', 'Natural Ventilation', 'Meditation Space', 'WiFi'],
  },
  {
    name: 'Premium Mountain View',
    price: 6500,
    description: 'Luxury suite with panoramic mountain views and private wellness area.',
    amenities: ['Mountain Views', 'Private Pool', 'Meditation Area', 'Premium Amenities'],
  },
];

const amenities = [
  { name: 'High-Speed WiFi', icon: '📡' },
  { name: 'Free Parking', icon: '🚗' },
  { name: 'Café & Restaurant', icon: '☕' },
  { name: 'Organic Dining', icon: '🥗' },
  { name: 'Fitness Center', icon: '💪' },
  { name: 'Meditation Pool', icon: '🏊' },
  { name: 'Nature Trails', icon: '🥾' },
  { name: 'Ayurvedic Spa', icon: '💆' },
];

const membershipBenefits = [
  'Unlimited stay access',
  '20% discount on all services',
  'Priority booking',
  'Free wellness consultations',
  'Exclusive member events',
  'Complimentary treatments',
  'VIP parking',
  'Lifetime validity',
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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [checkinDate, setCheckinDate] = useState('');
  const [checkoutDate, setCheckoutDate] = useState('');
  const [roomType, setRoomType] = useState('Deluxe Garden View');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    const storedName = localStorage.getItem('userName');
    if (storedEmail) setUserEmail(storedEmail);
    if (storedName) setUserName(storedName);
  }, []);

  const calculateDays = () => {
    if (!checkinDate || !checkoutDate) return 0;
    const checkout = new Date(checkoutDate);
    const checkin = new Date(checkinDate);
    return Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
  };

  const roomPrice = ROOM_TYPES[roomType as keyof typeof ROOM_TYPES] || 3500;
  const days = calculateDays();
  const totalAmount = days * roomPrice;

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!userEmail || !userName || !checkinDate || !checkoutDate || !roomType || !adults) {
        setMessage({ type: 'error', text: 'Please fill all required fields' });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/resort/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail.split('@')[0],
          userEmail,
          userName,
          userPhone,
          checkinDate,
          checkoutDate,
          roomType,
          adults,
          children,
          totalAmount,
          specialRequests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      setMessage({ type: 'success', text: `Booking confirmed! Your booking ID is: ${data.bookingId}` });
      setTimeout(() => {
        setShowBookingForm(false);
        resetForm();
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Booking failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCheckinDate('');
    setCheckoutDate('');
    setRoomType('Deluxe Garden View');
    setAdults(1);
    setChildren(0);
    setSpecialRequests('');
    setMessage({ type: '', text: '' });
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-[#f6f6f5] to-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-60" />
          <div className="relative z-10 container mx-auto px-4 py-24 text-white">
            <div>
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
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-2xl transition"
                >
                  Book Your Stay
                </button>
                <Link href="/calendar" className="border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition">
                  Explore Calendar
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="container mx-auto px-4 py-16 space-y-12">
          <div className="grid md:grid-cols-2 gap-8">
            {resortHighlights.map((highlight) => (
              <article key={highlight.title} className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  {highlight.icon}
                  <h3 className="text-xl font-semibold text-gray-900">{highlight.title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{highlight.description}</p>
              </article>
            ))}
          </div>

          {/* Daily Schedule Section */}
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
                  nervous systems, clearer minds, and a practical roadmap for sustaining Swar's daily practices at home.
                </p>
                <p className="mt-4 font-semibold text-sm uppercase tracking-[0.4em]">Only 32 guests per season</p>
              </div>
            </div>
          </div>

          {/* Room Types Section */}
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">Choose Your Haven</p>
              <h2 className="text-3xl font-bold text-gray-900">Room Types</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {roomTypes.map((room) => (
                <article key={room.name} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-lg hover:-translate-y-1 transition">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{room.name}</h3>
                  <p className="text-4xl font-bold text-green-600 mb-4">₹{room.price}/night</p>
                  <p className="text-gray-600 mb-4">{room.description}</p>
                  <div className="space-y-2">
                    {room.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-500">✓</span>
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Amenities Section */}
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">Facilities & Services</p>
              <h2 className="text-3xl font-bold text-gray-900">Resort Amenities</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {amenities.map((amenity) => (
                <div key={amenity.name} className="bg-white rounded-2xl p-6 shadow-lg text-center hover:shadow-xl transition">
                  <div className="text-4xl mb-2">{amenity.icon}</div>
                  <p className="text-gray-900 font-semibold text-sm">{amenity.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Membership Section */}
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">Exclusive Offer</p>
              <h2 className="text-3xl font-bold text-gray-900">Swar Membership</h2>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl p-8 border border-yellow-200">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Join the Swar Family</h3>
                  <p className="text-gray-700 mb-6">
                    Become a lifetime member and enjoy unlimited access to our sanctuary with exclusive benefits and privileges.
                  </p>
                  <div className="space-y-2 mb-6">
                    {membershipBenefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <span className="text-green-500 font-bold">✓</span>
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowBookingForm(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition"
                  >
                    Become a Member - ₹11,000 to ₹21,000
                  </button>
                </div>
                <div className="bg-white rounded-2xl p-6">
                  <p className="text-gray-600 mb-4">Valid for 5 years of unlimited stays and services.</p>
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <p className="text-sm text-gray-500">Annual Value</p>
                      <p className="text-2xl font-bold text-gray-900">₹42,000+</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Membership Cost</p>
                      <p className="text-3xl font-bold text-green-600">₹11,000 - ₹21,000</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">Find Us</p>
              <h2 className="text-3xl font-bold text-gray-900">Location & Contact</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-start gap-4 mb-6">
                  <MapPin className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                    <p className="text-gray-600">Swar Yoga Sanctuary, Brahmaputra Valley, Assam, India</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900 font-semibold">+91 98765 43210</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900 font-semibold">info@swarresort.com</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <Link href="/life-planner" className="block text-green-600 hover:text-green-700 font-semibold">
                    → Plan Your Wellness Journey
                  </Link>
                  <Link href="/calendar" className="block text-green-600 hover:text-green-700 font-semibold">
                    → Check Availability
                  </Link>
                  <Link href="/contact" className="block text-green-600 hover:text-green-700 font-semibold">
                    → Contact Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div
          onClick={() => setShowBookingForm(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Book Your Stay</h2>
              <button
                onClick={() => setShowBookingForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                <input
                  type="email"
                  placeholder="Email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (Optional)"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Your Dates</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                  <input
                    type="date"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>
                {days > 0 && <p className="text-sm text-gray-600">Duration: {days} nights</p>}
              </div>

              {/* Room Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Room Type</h3>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {Object.entries(ROOM_TYPES).map(([name, price]) => (
                    <option key={name} value={name}>
                      {name} - ₹{price}/night
                    </option>
                  ))}
                </select>
              </div>

              {/* Guests */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Guests</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between border border-gray-300 rounded-lg p-3">
                    <span className="text-gray-700">Adults</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(adults + 1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border border-gray-300 rounded-lg p-3">
                    <span className="text-gray-700">Children</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Special Requests (Optional)</h3>
                <textarea
                  placeholder="Any special requests or dietary preferences?"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Price Summary */}
              {days > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Room Rate ({days} nights × ₹{roomPrice})</span>
                    <span>₹{totalAmount}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total Amount</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              )}

              {/* Messages */}
              {message.text && (
                <div
                  className={`p-4 rounded-lg ${
                    message.type === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
