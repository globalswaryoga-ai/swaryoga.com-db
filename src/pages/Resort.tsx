import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Users,
  CheckCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { resortAPI, handleAPIError } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Resort: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState(0);
  const [bookingForm, setBookingForm] = useState({
    checkin: '',
    checkout: '',
    roomType: '',
    adults: '1',
    children: '0',
    specialRequests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();

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
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to make a booking');
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotalAmount();
      
      const bookingData = {
        id: Date.now().toString(),
        userId: user?.id || '',
        userEmail: user?.email || '',
        userName: user?.name || '',
        userPhone: '', // Could be collected in form
        checkinDate: bookingForm.checkin,
        checkoutDate: bookingForm.checkout,
        roomType: bookingForm.roomType,
        adults: parseInt(bookingForm.adults),
        children: parseInt(bookingForm.children),
        totalAmount: totalAmount,
        status: 'pending',
        specialRequests: bookingForm.specialRequests
      };

      // Save to database
      await resortAPI.create(bookingData);
      
      toast.success('Booking request submitted successfully! We will contact you shortly.');
      
      // Reset form
      setBookingForm({
        checkin: '',
        checkout: '',
        roomType: '',
        adults: '1',
        children: '0',
        specialRequests: ''
      });

      console.log('✅ Resort booking saved to database');
    } catch (error) {
      console.error('❌ Error submitting booking:', error);
      const errorMessage = handleAPIError(error);
      toast.error(`Booking failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomBooking = (roomName: string) => {
    setBookingForm(prev => ({
      ...prev,
      roomType: roomName
    }));
    toast.success(`${roomName} selected! Please fill in the booking form below.`);
  };

  const handleMembershipCall = () => {
    window.open('tel:+919309986820', '_self');
  };

  return (
    <div className="pt-16">
      <PageHeader 
        title="Swar Yoga Resort" 
        breadcrumbs={[{ name: 'Resort', path: '/resort' }]}
        image="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg"
      />

      {/* Enhanced Resort Overview Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-[#2A5654] mb-6">
                A Sanctuary for Mind, Body & Soul
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Nestled in the pristine hills of Maharashtra, our yoga resort offers a perfect blend of 
                traditional wisdom and modern comfort. Escape the chaos of city life and immerse yourself 
                in nature's tranquility while deepening your yoga practice.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our resort features eco-friendly accommodations, organic dining, and world-class yoga 
                facilities designed to support your journey toward wellness and self-discovery.
              </p>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">25+</div>
                  <div className="text-gray-600 font-medium">Acres of Natural Beauty</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">50+</div>
                  <div className="text-gray-600 font-medium">Comfortable Rooms</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleMembershipCall}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg transition-all duration-300 font-semibold hover:shadow-lg hover:translate-y-[-2px]"
                >
                  Explore Membership
                </button>
                <a
                  href="#booking"
                  className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-4 rounded-lg transition-all duration-300 text-center font-semibold"
                >
                  Book Your Stay
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <img 
                src="https://i.postimg.cc/sfpQ2n9p/temp-Imagecc-Gtjl.avif"
                alt="Resort main view with yoga pavilion" 
                className="rounded-lg shadow-lg h-48 object-cover"
              />
              <img 
                src="https://i.postimg.cc/GhhtzbGp/temp-Image-Z4z7-Ws.avif"
                alt="Resort dining area" 
                className="rounded-lg shadow-lg h-48 object-cover mt-8"
              />
              <img 
                src="https://i.postimg.cc/gcDz51HB/temp-Image-V1l-Ge1.avif"
                alt="Resort accommodation" 
                className="rounded-lg shadow-lg h-48 object-cover"
              />
              <img 
                src="https://i.postimg.cc/x1Bd0H7k/temp-Imagev-C9dn-H.avif"
                alt="Resort wellness facilities" 
                className="rounded-lg shadow-lg h-48 object-cover mt-8"
              />
            </motion.div>
          </div>

          {/* Resort Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TreePine className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Natural Setting</h3>
              <p className="text-gray-600">
                Surrounded by lush forests and pristine nature, offering the perfect environment for healing and rejuvenation.
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Waves className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Wellness Facilities</h3>
              <p className="text-gray-600">
                State-of-the-art spa, meditation halls, and therapeutic pools designed for complete wellness.
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-purple-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Premium Experience</h3>
              <p className="text-gray-600">
                Luxury accommodations with personalized service, ensuring every moment of your stay is exceptional.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#2A5654] mb-4">Resort Amenities</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need for a transformative wellness experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {amenities.map((amenity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <amenity.icon className="text-green-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{amenity.name}</h3>
                <p className="text-gray-600 text-sm">{amenity.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Types */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#2A5654] mb-4">Accommodation Options</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose from our thoughtfully designed rooms and unique accommodation experiences
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {roomTypes.map((room, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={room.image}
                    alt={room.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-lg font-bold">{room.name}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">₹{room.price}</div>
                        <div className="text-sm text-gray-500">per night</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">{room.description}</p>
                  <div className="space-y-2 mb-6">
                    {room.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="text-green-500 mr-2 flex-shrink-0" size={16} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => handleRoomBooking(room.name)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all duration-300 font-semibold hover:shadow-lg hover:transform hover:translate-y-[-2px]"
                  >
                    Select Room
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Plan */}
      <section className="py-20 bg-[#2A5654] text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Resort Membership Plan</h2>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Join our exclusive membership program and enjoy unlimited access to our resort 
                facilities with significant savings. Perfect for regular practitioners and wellness enthusiasts.
              </p>
              
              <div className="bg-white/10 rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-sm text-gray-300">Starting from</div>
                    <div className="text-3xl font-bold">₹12,999</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Valid for</div>
                    <div className="text-xl font-semibold">5 Years</div>
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  Limited time offer - Only 201 memberships available
                </div>
              </div>

              <button
                onClick={handleMembershipCall}
                className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Phone size={18} className="mr-2" />
                Call for Membership Details
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-semibold mb-6">Membership Benefits</h3>
              <div className="space-y-4">
                {membershipBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="text-green-400 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="booking" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#2A5654] mb-6">Location & Contact</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPin className="text-green-600 mt-1" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Resort Address</h3>
                    <p className="text-gray-600">
                      Swar Yoga International Resort<br />
                      At Dehari, Dist. Thane<br />
                      Maharashtra, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Phone className="text-green-600 mt-1" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Phone</h3>
                    <a href="tel:+919309986820" className="text-green-600 hover:text-green-700">
                      +91 93099 86820
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Mail className="text-green-600 mt-1" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Email</h3>
                    <a href="mailto:resort@swaryoga.org" className="text-green-600 hover:text-green-700">
                      resort@swaryoga.org
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Calendar className="text-green-600 mt-1" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Operating Hours</h3>
                    <p className="text-gray-600">
                      Open 24/7 for resort guests<br />
                      Check-in: 2:00 PM<br />
                      Check-out: 11:00 AM
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-lg shadow-lg p-8"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Book Your Stay</h3>
              
              {!isAuthenticated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 text-sm">
                    Please <a href="/signin" className="text-yellow-900 underline">sign in</a> to make a booking.
                  </p>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in *</label>
                    <input
                      type="date"
                      name="checkin"
                      value={bookingForm.checkin}
                      onChange={handleBookingFormChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out *</label>
                    <input
                      type="date"
                      name="checkout"
                      value={bookingForm.checkout}
                      onChange={handleBookingFormChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Type *</label>
                  <select 
                    name="roomType"
                    value={bookingForm.roomType}
                    onChange={handleBookingFormChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adults</label>
                    <select 
                      name="adults"
                      value={bookingForm.adults}
                      onChange={handleBookingFormChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                    <select 
                      name="children"
                      value={bookingForm.children}
                      onChange={handleBookingFormChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
                  <textarea
                    name="specialRequests"
                    value={bookingForm.specialRequests}
                    onChange={handleBookingFormChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Any special requirements or requests..."
                  />
                </div>

                {bookingForm.checkin && bookingForm.checkout && bookingForm.roomType && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Booking Summary</h4>
                    <p className="text-green-700 text-sm">
                      Total Amount: ₹{calculateTotalAmount().toLocaleString()}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !isAuthenticated}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting to Database...' : 'Submit Booking Request'}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    🔒 Your booking is securely saved to our database
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Resort;