'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  MapPin,
  Phone,
  Mail,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Dumbbell,
  Waves,
  TreePine,
  Star,
  Calendar,
  CheckCircle
} from 'lucide-react';

const roomTypes = [
  {
    name: 'Deluxe Garden View',
    price: 3500,
    image: 'https://i.postimg.cc/kMKwW6bW/temp-Imagej-Lsq-Gf.avif',
    features: ['Garden view', 'King bed', 'Private bathroom', 'Meditation corner'],
    description: 'Peaceful rooms overlooking our organic gardens with mountain views and modern amenities.'
  },
  {
    name: 'Traditional Bamboo House',
    price: 4500,
    image: 'https://i.postimg.cc/BvXPQ4M6/bamboo-house.avif',
    features: ['Eco-friendly bamboo construction', 'Traditional design', 'Natural ventilation', 'Authentic experience'],
    description: 'Experience authentic living in our beautifully crafted bamboo houses, blending tradition with comfort.'
  },
  {
    name: 'Premium Mountain View',
    price: 6500,
    image: 'https://i.postimg.cc/vZ4BFXPF/temp-Image-IIb-JFp.avif',
    features: ['Panoramic mountain views', 'Spacious balcony', 'Premium furnishing', 'Personal yoga space'],
    description: 'Our finest accommodations with breathtaking mountain vistas and luxury amenities for the ultimate retreat experience.'
  }
];

const amenities = [
  { icon: Wifi, name: 'Free WiFi', description: 'High-speed internet throughout the resort' },
  { icon: Car, name: 'Free Parking', description: 'Complimentary parking for all guests' },
  { icon: Coffee, name: 'Café & Lounge', description: 'Organic refreshments and herbal teas' },
  { icon: Utensils, name: 'Organic Dining', description: 'Farm-to-table vegetarian cuisine' },
  { icon: Dumbbell, name: 'Fitness Center', description: 'Modern equipment and yoga props' },
  { icon: Waves, name: 'Meditation Pool', description: 'Serene water features for contemplation' },
  { icon: TreePine, name: 'Nature Trails', description: 'Guided walks through pristine forests' },
  { icon: Star, name: 'Spa Services', description: 'Ayurvedic treatments and massages' },
];

const membershipBenefits = [
  'Free accommodation for 50 days over 5 years',
  '10 days per year for 2 people',
  '50% discount on additional room bookings',
  'Priority booking for workshops and retreats',
  'Complimentary yoga sessions',
  'Free access to all resort amenities',
  'Exclusive member-only events',
  'Ayurvedic consultation included'
];

export default function ResortPage() {
  const [bookingForm, setBookingForm] = useState({
    checkin: '',
    checkout: '',
    roomType: '',
    adults: '1',
    children: '0',
    specialRequests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.log('Error parsing user data:', err);
      }
    }
  }, []);

  const isAuthenticated = !!user;

  const handleBookingFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotalAmount = () => {
    if (!bookingForm.checkin || !bookingForm.checkout || !bookingForm.roomType) {
      return 0;
    }

    const checkinDate = new Date(bookingForm.checkin);
    const checkoutDate = new Date(bookingForm.checkout);
    const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const selectedRoomType = roomTypes.find(room => room.name === bookingForm.roomType);
    const roomPrice = selectedRoomType ? selectedRoomType.price : 0;
    
    return nights * roomPrice;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingForm.checkin || !bookingForm.checkout || !bookingForm.roomType) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Please sign in to make a booking' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const totalAmount = calculateTotalAmount();
      
      const response = await fetch('/api/resort/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.email?.split('@')[0] || '',
          userEmail: user?.email || '',
          userName: user?.name || user?.email || '',
          userPhone: '',
          checkinDate: bookingForm.checkin,
          checkoutDate: bookingForm.checkout,
          roomType: bookingForm.roomType,
          adults: parseInt(bookingForm.adults),
          children: parseInt(bookingForm.children),
          totalAmount: totalAmount,
          specialRequests: bookingForm.specialRequests
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Booking failed');
      }

      setMessage({ type: 'success', text: 'Booking request submitted successfully!' });
      
      setBookingForm({
        checkin: '',
        checkout: '',
        roomType: '',
        adults: '1',
        children: '0',
        specialRequests: ''
      });

      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
    } catch (error) {
      console.error('Error submitting booking:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Booking failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomBooking = (roomName: string) => {
    setBookingForm(prev => ({
      ...prev,
      roomType: roomName
    }));
    setMessage({ type: 'success', text: `${roomName} selected! Please fill in the booking form below.` });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3000);
  };

  const handleMembershipCall = () => {
    window.open('tel:+919779006820', '_self');
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative h-64 sm:h-80 md:h-96 bg-cover bg-center" style={{
          backgroundImage: 'url(https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg)',
        }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 sm:mb-4">Swar Yoga Resort</h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl">Resort</p>
          </div>
        </section>

        {/* Resort Opening Notice */}
        <section className="bg-gradient-to-r from-purple-100 to-blue-100 py-4 sm:py-6 px-3 sm:px-4">
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">🎉</span>
              <div className="text-center sm:text-left">
                <p className="text-swar-text font-semibold text-sm sm:text-lg">
                  Resort Opening <span className="text-purple-700 font-bold">22 December 2026</span>
                </p>
                <p className="text-swar-text text-xs sm:text-sm mt-1">Limited Early Bird Memberships Available</p>
              </div>
              <span className="text-xl sm:text-2xl">✨</span>
            </div>
          </div>
        </section>

        {/* Resort Overview Section */}
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center mb-12 md:mb-16">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#2A5654] mb-4 sm:mb-6">
                  A Sanctuary for Mind, Body & Soul
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-swar-text-secondary mb-4 sm:mb-6 leading-relaxed">
                  Nestled in the pristine hills of Maharashtra, our yoga resort offers a perfect blend of
                  traditional wisdom and modern comfort. Escape the chaos of city life and immerse yourself
                  in nature's tranquility while deepening your yoga practice.
                </p>
                <p className="text-sm sm:text-base md:text-lg text-swar-text-secondary mb-6 sm:mb-8 leading-relaxed">
                  Our resort features eco-friendly accommodations, organic dining, and world-class yoga
                  facilities designed to support your journey toward wellness and self-discovery.
                </p>

                <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-swar-primary mb-1 sm:mb-2">25+</div>
                    <div className="text-xs sm:text-sm md:text-base text-swar-text-secondary font-medium">Acres of Natural Beauty</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-swar-primary mb-1 sm:mb-2">50+</div>
                    <div className="text-xs sm:text-sm md:text-base text-swar-text-secondary font-medium">Comfortable Rooms</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handleMembershipCall}
                    className="bg-swar-primary hover:bg-swar-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 font-semibold hover:shadow-lg text-sm sm:text-base"
                  >
                    Explore Membership
                  </button>
                  <a
                    href="#booking"
                    className="border-2 border-green-600 text-swar-primary hover:bg-swar-primary hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 text-center font-semibold text-sm sm:text-base"
                  >
                    Book Your Stay
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <img
                  src="https://i.postimg.cc/sfpQ2n9p/temp-Imagecc-Gtjl.avif"
                  alt="Resort main view with yoga pavilion"
                  className="rounded-lg shadow-lg h-40 sm:h-48 object-cover"
                />
                <img
                  src="https://i.postimg.cc/GhhtzbGp/temp-Image-Z4z7-Ws.avif"
                  alt="Resort dining area"
                  className="rounded-lg shadow-lg h-40 sm:h-48 object-cover mt-0 sm:mt-8"
                />
                <img
                  src="https://i.postimg.cc/gcDz51HB/temp-Image-V1l-Ge1.avif"
                  alt="Resort accommodation"
                  className="rounded-lg shadow-lg h-40 sm:h-48 object-cover"
                />
                <img
                  src="https://i.postimg.cc/x1Bd0H7k/temp-Imagev-C9dn-H.avif"
                  alt="Resort wellness facilities"
                  className="rounded-lg shadow-lg h-40 sm:h-48 object-cover mt-0 sm:mt-8"
                />
              </div>
            </div>

            {/* Resort Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-swar-primary-light rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <TreePine className="text-swar-primary" size={28} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-swar-text mb-2 sm:mb-3">Natural Setting</h3>
                <p className="text-xs sm:text-sm md:text-base text-swar-text-secondary">
                  Surrounded by lush forests and pristine nature, offering the perfect environment for healing and rejuvenation.
                </p>
              </div>

              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Waves className="text-blue-600" size={28} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-swar-text mb-2 sm:mb-3">Wellness Facilities</h3>
                <p className="text-xs sm:text-sm md:text-base text-swar-text-secondary">
                  State-of-the-art spa, meditation halls, and therapeutic pools designed for complete wellness.
                </p>
              </div>

              <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Star className="text-purple-600" size={28} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-swar-text mb-2 sm:mb-3">Premium Experience</h3>
                <p className="text-xs sm:text-sm md:text-base text-swar-text-secondary">
                  Luxury accommodations with personalized service, ensuring every moment of your stay is exceptional.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section className="py-12 sm:py-16 md:py-20 bg-swar-bg">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2A5654] mb-3 sm:mb-4">Resort Amenities</h2>
              <p className="text-xs sm:text-sm md:text-base text-swar-text-secondary max-w-2xl mx-auto">
                Everything you need for a transformative wellness experience
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {amenities.map((amenity, index) => {
                const IconComponent = amenity.icon;
                return (
                  <div key={index} className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-swar-primary-light rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                      <IconComponent className="text-swar-primary" size={20} />
                    </div>
                    <h3 className="text-sm sm:text-lg font-semibold text-swar-text mb-1 sm:mb-2">{amenity.name}</h3>
                    <p className="text-xs sm:text-sm text-swar-text-secondary">{amenity.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Room Types */}
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2A5654] mb-3 sm:mb-4">Accommodation Options</h2>
              <p className="text-xs sm:text-sm md:text-base text-swar-text-secondary max-w-2xl mx-auto px-2">
                Choose from our thoughtfully designed rooms and unique accommodation experiences
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {roomTypes.map((room, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:md:scale-105"
                >
                  <div className="h-40 sm:h-48 md:h-56 lg:h-64 overflow-hidden relative">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 text-white">
                      <h3 className="text-sm sm:text-base md:text-lg font-bold">{room.name}</h3>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="flex-1">
                        <div className="text-right">
                          <div className="text-xl sm:text-2xl font-bold text-swar-primary">₹{room.price}</div>
                          <div className="text-xs sm:text-sm text-swar-text-secondary">per night</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-swar-text-secondary mb-3 sm:mb-4 leading-relaxed">{room.description}</p>
                    <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                      {room.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-xs sm:text-sm text-swar-text-secondary">
                          <CheckCircle className="text-swar-primary mr-2 flex-shrink-0" size={16} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleRoomBooking(room.name)}
                      className="w-full bg-swar-primary hover:bg-swar-primary text-white py-2.5 sm:py-3 rounded-lg transition-all duration-300 font-semibold hover:shadow-lg text-sm sm:text-base"
                    >
                      Select Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Membership Plan */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#2A5654] text-white">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Resort Membership Plan</h2>
                <p className="text-xs sm:text-sm md:text-base text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                  Join our exclusive membership program and enjoy unlimited access to our resort
                  facilities with significant savings. Perfect for regular practitioners and wellness enthusiasts.
                </p>

                <div className="bg-white/10 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-300">Starting from</div>
                      <div className="text-2xl sm:text-3xl font-bold">₹21,777</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm text-gray-300">Valid for</div>
                      <div className="text-xl sm:text-2xl font-semibold">5 Years</div>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">
                    Limited time offer - Only 201 memberships available
                  </div>
                </div>

                <button
                  onClick={handleMembershipCall}
                  className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base font-semibold"
                >
                  <Phone size={16} className="mr-2" />
                  Call for Membership Details
                </button>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Membership Benefits</h3>
                <div className="space-y-3 sm:space-y-4">
                  {membershipBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-xs sm:text-sm md:text-base text-gray-300">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Form Section */}
        <section id="booking" className="py-12 sm:py-16 md:py-20 bg-swar-bg">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#2A5654] mb-4 sm:mb-6">Location & Contact</h2>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <MapPin className="text-swar-primary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-semibold text-swar-text mb-1 sm:mb-2 text-sm sm:text-base">Resort Address</h3>
                      <p className="text-xs sm:text-sm text-swar-text-secondary leading-relaxed">
                        Swar Yoga International Resort<br />
                        At Dehari, Dist. Thane<br />
                        Maharashtra, India
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <Phone className="text-swar-primary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-semibold text-swar-text mb-1 sm:mb-2 text-sm sm:text-base">Phone</h3>
                      <a href="tel:+919779006820" className="text-swar-primary hover:text-swar-primary text-sm sm:text-base break-all">
                        +91 9779006820
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <Mail className="text-swar-primary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-semibold text-swar-text mb-1 sm:mb-2 text-sm sm:text-base">Email</h3>
                      <a href="mailto:resort@swaryoga.org" className="text-swar-primary hover:text-swar-primary text-xs sm:text-sm md:text-base break-all">
                        resort@swaryoga.org
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <Calendar className="text-swar-primary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h3 className="font-semibold text-swar-text mb-1 sm:mb-2 text-sm sm:text-base">Operating Hours</h3>
                      <p className="text-xs sm:text-sm text-swar-text-secondary leading-relaxed">
                        Open 24/7 for resort guests<br />
                        Check-in: 2:00 PM<br />
                        Check-out: 11:00 AM
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl font-semibold text-swar-text mb-4 sm:mb-6">Book Your Stay</h3>

                {!isAuthenticated && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <p className="text-yellow-800 text-xs sm:text-sm">
                      Please <Link href="/signin" className="text-yellow-900 underline">sign in</Link> to make a booking.
                    </p>
                  </div>
                )}

                {message.text && (
                  <div
                    className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-xs sm:text-sm ${
                      message.type === 'error'
                        ? 'bg-red-50 text-swar-primary border border-red-200'
                        : 'bg-swar-primary-light text-swar-primary border border-green-200'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-swar-text mb-1 sm:mb-2">Check-in *</label>
                      <input
                        type="date"
                        name="checkin"
                        value={bookingForm.checkin}
                        onChange={handleBookingFormChange}
                        className="w-full p-2.5 sm:p-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary text-xs sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-swar-text mb-1 sm:mb-2">Check-out *</label>
                      <input
                        type="date"
                        name="checkout"
                        value={bookingForm.checkout}
                        onChange={handleBookingFormChange}
                        className="w-full p-2.5 sm:p-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary text-xs sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-swar-text mb-1 sm:mb-2">Room Type *</label>
                    <select
                      name="roomType"
                      value={bookingForm.roomType}
                      onChange={handleBookingFormChange}
                      className="w-full p-2.5 sm:p-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary text-xs sm:text-sm"
                      required
                    >
                      <option value="">Select room type</option>
                      {roomTypes.map((room, index) => (
                        <option key={index} value={room.name}>
                          {room.name} - ₹{room.price}/night
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-swar-text mb-1 sm:mb-2">Adults</label>
                      <select
                        name="adults"
                        value={bookingForm.adults}
                        onChange={handleBookingFormChange}
                        className="w-full p-2.5 sm:p-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary text-xs sm:text-sm"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-swar-text mb-1 sm:mb-2">Children</label>
                      <select
                        name="children"
                        value={bookingForm.children}
                        onChange={handleBookingFormChange}
                        className="w-full p-2.5 sm:p-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary text-xs sm:text-sm"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-swar-text mb-1 sm:mb-2">Special Requests</label>
                    <textarea
                      name="specialRequests"
                      value={bookingForm.specialRequests}
                      onChange={handleBookingFormChange}
                      rows={3}
                      className="w-full p-2.5 sm:p-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary text-xs sm:text-sm"
                      placeholder="Any special requirements or requests..."
                    />
                  </div>

                  {bookingForm.checkin && bookingForm.checkout && bookingForm.roomType && (
                    <div className="bg-swar-primary-light border border-green-200 rounded-lg p-3 sm:p-4">
                      <h4 className="font-semibold text-swar-primary mb-1 sm:mb-2 text-sm sm:text-base">Booking Summary</h4>
                      <p className="text-swar-primary text-xs sm:text-sm">
                        Total Amount: <span suppressHydrationWarning>₹{calculateTotalAmount().toLocaleString()}</span>
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !isAuthenticated}
                    className="w-full bg-swar-primary hover:bg-swar-primary text-white py-2.5 sm:py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base"
                  >
                    {isSubmitting ? 'Submitting to Database...' : 'Submit Booking Request'}
                  </button>

                  <div className="text-center">
                    <p className="text-xs text-swar-text-secondary">
                      🔒 Your booking is securely saved to our database
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
