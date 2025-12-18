'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, X, Calendar } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const HomePage = () => {
  const [showMembershipPopup, setShowMembershipPopup] = useState(false);


  const membershipDetails = {
    price: 11000,
    maxParticipants: 201,
    accommodationDays: 50,
    validity: '5 years',
    stayPerYear: '10 days',
    peoplePerStay: 2,
    discountRate: 50,
    priceRange: {
      min: 11000,
      max: 21000
    }
  };

  const workshopTypes = [
    { type: 'Online', color: 'from-blue-600 to-blue-700', icon: '🌐' },
    { type: 'Offline', color: 'from-purple-600 to-purple-700', icon: '🏢' },
    { type: 'Residential', color: 'from-green-600 to-green-700', icon: '🏨' },
    { type: 'Recorded', color: 'from-orange-600 to-orange-700', icon: '📹' }
  ];

  return (
    <div className="bg-white">
      <Navigation />
      {/* Hero Section */}
      <section className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg"
            alt="Peaceful nature yoga setting"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10 safe-area-left safe-area-right">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif mb-4 sm:mb-6">
                <span className="text-white font-light block mb-2">Welcome to</span>
                <span className="text-green-400 font-medium">Swar Yoga</span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-6 sm:mb-8 leading-relaxed">
                The Science of Breath - Ancient yogic practices that unlock the secrets of conscious breathing for optimal health and vitality.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 flex-wrap"
            >
              <Link
                href="/workshops"
                className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 flex items-center justify-center group hover:translate-y-[-2px] hover:shadow-lg touch-target"
              >
                <span className="text-base sm:text-lg">Start Your Journey</span>
                <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/about"
                className="border-2 border-white hover:bg-white/10 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 text-center text-base sm:text-lg hover:translate-y-[-2px] touch-target"
              >
                Learn More
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 sm:py-20 bg-gray-50 safe-area-left safe-area-right">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#2A5654] mb-4 sm:mb-6">Discover Swar Yoga</h2>
              <p className="text-gray-700 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                At Swar Yoga, we believe in the transformative power of breath to bring balance and harmony to your life. 
                Our approach combines traditional yoga practices with modern wellness techniques to create a holistic 
                experience for practitioners of all levels.
              </p>
              <p className="text-gray-700 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                Whether you're looking to deepen your practice, find stress relief, or embark on a journey of 
                self-discovery, our experienced instructors are here to guide you every step of the way.
              </p>
              <Link 
                href="/about" 
                className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition-colors touch-target"
              >
                <span>Learn more about our philosophy</span>
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="aspect-[4/5] lg:aspect-auto lg:h-[500px] relative rounded-lg overflow-hidden shadow-xl">
                <img
                  src="https://i.postimg.cc/J4zrWKT7/temp-Image6-FKl-H4.avif"
                  alt="Swar Yoga practice and meditation"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-red-500 text-white p-4 sm:p-6 rounded-lg shadow-lg hidden lg:block">
                <p className="text-xl font-serif">25+ Years</p>
                <p className="text-sm">of teaching experience</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workshops CTA Section */}
      <section className="py-16 sm:py-20 bg-white safe-area-left safe-area-right">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#2A5654] mb-4">Transform Your Practice</h2>
            <p className="text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 text-sm sm:text-base">
              Join our comprehensive workshop programs and discover the ancient science of breath
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            {/* Single Workshop Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative h-48 sm:h-64 md:h-80 rounded-lg overflow-hidden shadow-xl mb-8 sm:mb-10"
            >
              <img
                src="https://i.postimg.cc/kGRQhYJg/tempImageai7DlM.avif"
                alt="Swar Yoga Workshops - Ancient Science of Brain Breathing"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 text-white">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                  Discover Ancient Wisdom
                </h3>
                <p className="text-sm sm:text-lg text-gray-200">
                  Join our transformative workshops and retreats
                </p>
              </div>
            </motion.div>

            {/* Workshop Type Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10"
            >
              {workshopTypes.map((workshop, index) => (
                <Link
                  key={index}
                  href="/workshops"
                  className={`bg-gradient-to-br ${workshop.color} text-white p-4 sm:p-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] touch-target text-center group`}
                >
                  <div className="text-3xl sm:text-4xl mb-2">{workshop.icon}</div>
                  <div className="font-semibold text-sm sm:text-base">{workshop.type}</div>
                  <div className="text-xs sm:text-sm text-white/80 group-hover:text-white transition-colors">Register Now</div>
                </Link>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10"
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">25+</div>
                <div className="text-gray-600 text-sm sm:text-base">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">8000+</div>
                <div className="text-gray-600 text-sm sm:text-base">Students Trained</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">15+</div>
                <div className="text-gray-600 text-sm sm:text-base">Countries Reached</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">100%</div>
                <div className="text-gray-600 text-sm sm:text-base">Satisfaction Rate</div>
              </div>
            </motion.div>

            {/* View All Workshops Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Link
                href="/workshops"
                className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 text-base sm:text-lg font-medium hover:shadow-lg hover:translate-y-[-2px] group touch-target"
              >
                <Calendar size={20} className="mr-2 sm:mr-3 sm:h-6 sm:w-6" />
                <span>Explore All 18 Workshops</span>
                <ArrowRight size={16} className="ml-2 sm:ml-3 sm:h-5 sm:w-5 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Resort Section */}
      <section className="py-16 sm:py-20 bg-[#2A5654] text-white safe-area-left safe-area-right">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif mb-4 sm:mb-6">Experience Our Yoga Resort</h2>
              <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                Nestled in the serene mountains, our yoga resort offers a peaceful retreat from the hustle and bustle of everyday life. 
                Immerse yourself in nature while deepening your yoga practice in our beautiful studios and tranquil surroundings.
              </p>
              <p className="text-gray-300 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                Enjoy comfortable accommodations, nourishing organic meals, and a variety of wellness activities 
                designed to rejuvenate your body, mind, and spirit in our pristine natural environment.
              </p>
              
              {/* Membership Pricing Display */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
                <p className="text-gray-300 text-sm sm:text-base mb-2">Membership Starting from</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl font-bold">₹11,000</span>
                  <span className="text-gray-400">to</span>
                  <span className="text-3xl sm:text-4xl font-bold">₹21,000</span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">Valid for 5 years with exclusive benefits</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/resort" 
                  className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-3 rounded-lg transition-colors touch-target"
                >
                  <span>Explore Our Resort</span>
                  <ArrowRight size={18} className="ml-2" />
                </Link>
                <button
                  onClick={() => setShowMembershipPopup(true)}
                  className="inline-flex items-center justify-center bg-white text-[#2A5654] px-4 sm:px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors touch-target"
                >
                  View Membership Plan
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                src="https://i.postimg.cc/vZ4BFXPF/temp-Image-IIb-JFp.avif"
                alt="Resort exterior and natural surroundings"
                className="rounded-lg h-32 sm:h-48 md:h-56 object-cover shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                src="https://i.postimg.cc/MKmQ9snW/aaa-candal.avif"
                alt="Yoga studio and meditation spaces"
                className="rounded-lg h-32 sm:h-48 md:h-56 object-cover mt-4 sm:mt-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                src="https://i.postimg.cc/5NTZkmTR/temp-Image-Gmbma-U.avif"
                alt="Resort amenities and wellness facilities"
                className="rounded-lg h-32 sm:h-48 md:h-56 object-cover shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                src="https://i.postimg.cc/hGJyQCn0/tempImageCNl8Fp.avif"
                alt="Dining area and organic cuisine"
                className="rounded-lg h-32 sm:h-48 md:h-56 object-cover mt-4 sm:mt-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-green-600 text-white safe-area-left safe-area-right">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif mb-4 sm:mb-6">Begin Your Yoga Journey Today</h2>
          <p className="text-base sm:text-lg md:text-xl text-green-100 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Join our community and discover the transformative power of yoga. Whether you're a beginner or an experienced practitioner, we have classes and workshops for every level.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/workshops"
              className="bg-white hover:bg-gray-100 text-green-600 px-4 sm:px-6 py-3 rounded-lg transition-colors touch-target"
            >
              Browse Workshops
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white hover:bg-white hover:text-green-600 text-white px-4 sm:px-6 py-3 rounded-lg transition-colors touch-target"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Membership Popup */}
      <AnimatePresence>
        {showMembershipPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 safe-area-left safe-area-right"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-xl max-w-sm sm:max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowMembershipPopup(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
              >
                <X size={24} />
              </button>

              <div className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#2A5654] mb-2">Resort Membership</h3>
                  <p className="text-gray-600 text-sm sm:text-base">Limited time offer - Only {membershipDetails.maxParticipants} spots available</p>
                </div>

                <div className="bg-gradient-to-br from-[#2A5654] to-[#1F4240] rounded-lg p-6 text-white mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-300">Price Range</p>
                      <p className="text-2xl sm:text-3xl font-bold">₹{membershipDetails.priceRange.min.toLocaleString()} - ₹{membershipDetails.priceRange.max.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">Valid for</p>
                      <p className="text-lg sm:text-xl font-semibold">{membershipDetails.validity}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm sm:text-base">
                    <p>✓ {membershipDetails.accommodationDays} days free accommodation</p>
                    <p>✓ {membershipDetails.stayPerYear} days per year for {membershipDetails.peoplePerStay} people</p>
                    <p>✓ {membershipDetails.discountRate}% discount on room rates for friends</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Early Bird Pricing</h4>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Special pricing from ₹{membershipDetails.priceRange.min.toLocaleString()} to ₹{membershipDetails.priceRange.max.toLocaleString()} based on booking sequence. Limited membership spots available!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/resort"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-center transition-colors touch-target font-medium"
                      onClick={() => setShowMembershipPopup(false)}
                    >
                      Learn More
                    </Link>
                    <a
                      href="tel:+919779006820"
                      className="flex-1 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg transition-colors touch-target font-medium"
                    >
                      <Phone size={18} className="mr-2" />
                      Call for Details
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default HomePage;
