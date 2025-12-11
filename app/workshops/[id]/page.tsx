'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Calendar, Clock, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// Schedule interface removed; full-page register view now handles schedules per mode

const workshopDetails: Record<string, any> = {
  'swar-yoga-basic': {
    id: 1,
    name: 'Swar Yoga Basic Workshop',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Introduction to Swar Yoga', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Breathing Basics', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'First Steps', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    duration: '3 days',
    level: 'Beginner',
    instructor: 'Master Yoga Instructor',
    price: '₹2,999',
    currency: 'INR',
    description: 'Foundation of Swar Yoga practice and breathing techniques.',
    fullDescription: `The Swar Yoga Basic Workshop is the perfect starting point for anyone interested in learning the ancient science of Swar Yoga. Over 3 intensive days, you'll master the fundamental breathing techniques and postures that form the foundation of this powerful practice.

This beginner-friendly workshop teaches you the basic principles of Swar Yoga, which focuses on the science of breath and its connection to physical health, mental clarity, and spiritual development. Whether you're looking to improve your overall wellness or begin a deeper yoga journey, this workshop provides the essential foundation you need.

Topics covered:
- Introduction to Swar Yoga philosophy
- Basic breathing techniques and pranayama
- Fundamental yoga postures and alignment
- Daily practice guidelines
- Common mistakes and how to avoid them`,
    benefits: [
      'Learn authentic Swar Yoga techniques',
      'Improved breathing capacity',
      'Increased energy and vitality',
      'Better stress management',
      'Foundation for advanced practices',
      'Enhanced body awareness'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-15', endDate: '2025-01-17', time: '6:00 AM - 8:00 AM', seats: 30, price: 2999, currency: 'INR' },
      { id: 's2', startDate: '2025-02-20', endDate: '2025-02-22', time: '6:00 AM - 8:00 AM', seats: 30, price: 2999, currency: 'INR' },
      { id: 's3', startDate: '2025-03-15', endDate: '2025-03-17', time: '5:00 PM - 7:00 PM', seats: 25, price: 2999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Priya Sharma', role: 'Software Developer', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Amazing foundation course! I finally understand how breathing techniques can transform your life.', rating: 5 },
      { id: 2, name: 'Rajesh Kumar', role: 'Business Owner', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'The instructor made everything so clear and easy to understand. Highly recommended!', rating: 5 },
      { id: 3, name: 'Anjali Patel', role: 'Teacher', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'Perfect for beginners. I feel energized after just 3 days!', rating: 5 }
    ]
  },
  'swar-yoga-level-1': {
    id: 2,
    name: 'Swar Yoga Level-1 Workshop',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Level-1 Overview', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Advanced Breathing', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'Meditation Techniques', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    duration: '15 days',
    level: 'Beginner',
    instructor: 'Master Yoga Instructor',
    price: '₹9,999',
    currency: 'INR',
    description: 'Comprehensive Level-1 training in Swar Yoga.',
    fullDescription: `The Swar Yoga Level-1 Workshop is a comprehensive 15-day program designed to deepen your understanding of Swar Yoga principles and practices. This workshop builds upon the basics and introduces more advanced breathing techniques, meditation practices, and lifestyle applications.

Over these 15 days, you'll gain a thorough understanding of how Swar Yoga can positively impact every aspect of your life - from physical health to mental peace and spiritual growth.

What you'll master:
- Advanced breathing techniques (Pranayama)
- Proper meditation practice
- Yoga asanas for Swar Yoga
- Connection between breathing and daily activities
- Health applications and lifestyle integration`,
    benefits: [
      'Comprehensive understanding of Swar Yoga',
      'Mastery of intermediate breathing techniques',
      'Deep meditation practice',
      'Improved health and vitality',
      'Ability to teach basics to others',
      'Spiritual growth and awareness'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-20', endDate: '2025-02-03', time: '6:00 AM - 9:00 AM', seats: 25, price: 9999, currency: 'INR' },
      { id: 's2', startDate: '2025-03-01', endDate: '2025-03-15', time: '6:00 AM - 9:00 AM', seats: 25, price: 9999, currency: 'INR' },
      { id: 's3', startDate: '2025-04-10', endDate: '2025-04-24', time: '5:00 PM - 8:00 PM', seats: 20, price: 9999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Vikram Singh', role: 'Yoga Practitioner', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'Level-1 took my practice to a completely different level. Life-changing experience!', rating: 5 },
      { id: 2, name: 'Meera Desai', role: 'Wellness Coach', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Comprehensive and well-structured. I now guide my clients using what I learned.', rating: 5 },
      { id: 3, name: 'Arjun Nair', role: 'Entrepreneur', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'Best investment in my health. The 15-day program is perfect.', rating: 5 }
    ]
  },
  'swar-yoga-youth': {
    id: 3,
    name: 'Swar Yoga Youth Program',
    image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Youth Program Intro', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Focus & Concentration', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'Energy Boost Tips', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    duration: '10 days',
    level: 'Beginner',
    instructor: 'Master Yoga Instructor',
    price: '₹4,999',
    currency: 'INR',
    description: 'Specially designed Swar Yoga program for young practitioners.',
    fullDescription: `The Swar Yoga Youth Program is specially designed for teenagers and young adults. This 10-day intensive program introduces the transformative power of Swar Yoga through methods and approaches tailored to youth. It combines traditional wisdom with modern understanding of how breathing techniques can enhance focus, energy, and overall quality of life.

Perfect for students, young professionals, and athletes, this program helps you:
- Boost mental clarity and focus for studies
- Increase physical energy and strength
- Manage stress and anxiety
- Develop emotional intelligence
- Build healthy lifestyle habits

The program uses engaging teaching methods and includes interactive sessions, practical exercises, and group activities.`,
    benefits: [
      'Enhanced focus and concentration for studies',
      'Increased physical energy and stamina',
      'Better stress and emotion management',
      'Improved sleep quality',
      'Confidence and self-esteem boost',
      'Life-long healthy habits'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-25', endDate: '2025-02-03', time: '4:00 PM - 6:00 PM', seats: 35, price: 4999, currency: 'INR' },
      { id: 's2', startDate: '2025-03-20', endDate: '2025-03-29', time: '4:00 PM - 6:00 PM', seats: 35, price: 4999, currency: 'INR' },
      { id: 's3', startDate: '2025-05-01', endDate: '2025-05-10', time: '4:00 PM - 6:00 PM', seats: 30, price: 4999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Aditya Kumar', role: 'College Student', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'My grades improved after the program! The focus and clarity are amazing.', rating: 5 },
      { id: 2, name: 'Sneha Verma', role: 'Student Athlete', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Perfect for my athletic performance. Breathing techniques really help!', rating: 5 },
      { id: 3, name: 'Rohan Malhotra', role: 'Young Professional', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'Best way to start my professional journey with a clear mind.', rating: 5 }
    ]
  },
  '4': {
    id: 4,
    name: 'Weight Loss Program',
    image: 'https://images.pexels.com/photos/1624365/pexels-photo-1624365.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '90 days',
    level: 'Intermediate',
    instructor: 'Master Yoga Instructor',
    price: '₹19,999',
    currency: 'INR',
    description: 'Transform your body through Swar Yoga and natural methods.',
    fullDescription: `Achieve sustainable weight loss through the ancient science of Swar Yoga combined with natural diet and lifestyle changes. This 90-day transformational program is designed to help you lose weight naturally and keep it off permanently.

This program addresses the root causes of weight gain including hormonal imbalances, improper breathing, and lifestyle habits. Through Swar Yoga, proper breathing techniques, guided diet, and exercise, you'll transform your body and overall health.

Program includes:
- Daily Swar Yoga and breathing exercises
- Nutritional guidance and meal plans
- Lifestyle modifications
- Progress tracking and motivation
- Wellness coaching`,
    benefits: [
      'Sustainable weight loss',
      'Improved metabolism',
      'Increased energy levels',
      'Better digestion',
      'Enhanced confidence',
      'Long-lasting results'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-10', endDate: '2025-04-10', time: '6:00 AM - 7:00 AM', seats: 20, price: 19999, currency: 'INR' },
      { id: 's2', startDate: '2025-02-15', endDate: '2025-05-15', time: '5:00 PM - 6:00 PM', seats: 20, price: 19999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Deepika Singh', role: 'House Wife', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Lost 15kg in 90 days! The program is amazing and sustainable.', rating: 5 },
      { id: 2, name: 'Rohit Gupta', role: 'Office Executive', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'Finally found a weight loss solution that works. No side effects!', rating: 5 },
      { id: 3, name: 'Kavya Menon', role: 'Health Enthusiast', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'More than weight loss - gained health and vitality!', rating: 5 }
    ]
  },
  '5': {
    id: 5,
    name: 'Meditation Program',
    image: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '15 days',
    level: 'All Levels',
    instructor: 'Master Yoga Instructor',
    price: '₹7,999',
    currency: 'INR',
    description: 'Deep meditation and mindfulness training for inner peace.',
    fullDescription: `Discover the power of meditation to transform your mind and achieve lasting inner peace. This 15-day intensive meditation program teaches authentic techniques passed down through generations of yogic traditions.

Learn various meditation methods and find the practice that resonates most with you. From breath-awareness meditation to visualization and mantra meditation, this program covers everything you need to establish a powerful meditation practice.

What you'll learn:
- Different meditation techniques
- Proper posture and breathing
- Overcoming common meditation challenges
- Daily meditation practice
- Meditation for specific life goals`,
    benefits: [
      'Inner peace and tranquility',
      'Reduced stress and anxiety',
      'Enhanced emotional balance',
      'Better concentration and focus',
      'Improved sleep quality',
      'Spiritual awakening'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-15', endDate: '2025-01-29', time: '5:30 AM - 6:30 AM', seats: 30, price: 7999, currency: 'INR' },
      { id: 's2', startDate: '2025-03-01', endDate: '2025-03-15', time: '6:00 PM - 7:00 PM', seats: 30, price: 7999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Nikhil Sharma', role: 'IT Professional', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'My anxiety completely disappeared after this program!', rating: 5 },
      { id: 2, name: 'Priya Joshi', role: 'Artist', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Meditation opened up my creativity in unexpected ways.', rating: 5 },
      { id: 3, name: 'Amit Verma', role: 'Business Owner', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'Best decision for my mental health and business clarity.', rating: 5 }
    ]
  },
  'happy-married-life': {
    id: 15,
    name: 'Happy Married Life',
    image: 'https://images.pexels.com/photos/3807512/pexels-photo-3807512.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Building Stronger Relationships', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Communication & Understanding', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'Love & Harmony Through Breathing', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    duration: '36 days (2 days/week)',
    level: 'All Levels',
    instructor: 'Master Yoga Instructor',
    price: '₹7,999',
    currency: 'INR',
    description: 'Transform your married life with proven Swar Yoga techniques and practices.',
    fullDescription: `The Happy Married Life Program is a specially designed 36-day program to strengthen and enrich your married relationship. Through the ancient wisdom of Swar Yoga combined with modern relationship psychology, this program helps couples deepen their connection and build lasting harmony.

Over 36 days (2 sessions per week), you'll learn:
- Breathing techniques that synchronize with your partner
- Meditation practices for emotional understanding
- Communication enhancement through yoga principles
- Stress relief for a happier home
- Building trust and intimacy
- Handling conflicts with compassion

This program is perfect for:
- Newly married couples
- Long-term married couples wanting to strengthen bonds
- Couples experiencing relationship challenges
- Anyone wanting to build a more harmonious marriage`,
    benefits: [
      'Deeper emotional connection with partner',
      'Improved communication and understanding',
      'Reduced stress and anxiety in relationships',
      'Enhanced intimacy and trust',
      'Better conflict resolution skills',
      'Lasting happiness and harmony',
      'Spiritual alignment with partner'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-20', endDate: '2025-03-02', time: '6:00 PM - 7:30 PM', seats: 20, price: 7999, currency: 'INR' },
      { id: 's2', startDate: '2025-02-15', endDate: '2025-03-29', time: '5:00 PM - 6:30 PM', seats: 20, price: 7999, currency: 'INR' },
      { id: 's3', startDate: '2025-03-15', endDate: '2025-04-26', time: '6:00 PM - 7:30 PM', seats: 18, price: 7999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Rahul & Priya', role: 'Married Couple', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'This program completely transformed our relationship. We feel closer than ever!', rating: 5 },
      { id: 2, name: 'Arjun & Sneha', role: 'Young Couple', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'We learned so much about each other. Highly recommend for all couples!', rating: 5 },
      { id: 3, name: 'Vikram & Anjali', role: 'Experienced Couple', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'After 20 years of marriage, this program revived our spark. Amazing!', rating: 5 }
    ]
  }
};

export default function WorkshopDetail() {
  const params = useParams();
  const workshopSlug = params.id as string;
  const workshop = workshopDetails[workshopSlug] || workshopDetails['swar-yoga-basic'];
  // Modal and inline checkout handling removed in favor of full-page register view

  return (
    <>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-96 md:h-screen flex items-center overflow-hidden mt-20">
          <div className="absolute inset-0 z-0">
            <img
              src={workshop.heroImage}
              alt={workshop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="inline-block bg-primary-600 text-white px-4 py-2 rounded-full mb-6 font-semibold">
                {workshop.level}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {workshop.name}
              </h1>
              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-8">
                {workshop.description}
              </p>

              <Link
                href={`/workshops/${workshopSlug}/register`}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-semibold text-lg"
              >
                Register Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Workshop Details */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            {/* Key Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Clock className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Duration</h3>
                <p className="text-2xl font-bold text-primary-600">{workshop.duration}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Users className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Instructor</h3>
                <p className="text-lg font-semibold text-gray-700">{workshop.instructor}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Star className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Level</h3>
                <p className="text-lg font-semibold text-gray-700">{workshop.level}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Price</h3>
                <p className="text-2xl font-bold text-primary-600">{workshop.price}</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">About This Workshop</h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-8 whitespace-pre-wrap">
                {workshop.fullDescription}
              </p>

              <h3 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workshop.benefits.map((benefit: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-16">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={workshop.videoUrl}
                  title={workshop.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Small Videos Section */}
            {workshop.smallVideos && workshop.smallVideos.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-8">Watch More Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {workshop.smallVideos.map((video: any) => (
                    <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={video.url}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 text-center">{video.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonies Section */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">
                Student Testimonies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {workshop.testimonies.map((testimony: any) => (
                  <div
                    key={testimony.id}
                    className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <img
                        src={testimony.image}
                        alt={testimony.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-gray-800">{testimony.name}</h4>
                        <p className="text-gray-600 text-sm">{testimony.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimony.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-gray-700 italic">"{testimony.text}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-2xl p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Life?
              </h2>
              <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
                Join hundreds of satisfied students who have experienced the power of pranayama and breathing techniques.
              </p>
              <Link
                href={`/workshops/${workshopSlug}/register`}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-primary-600 px-10 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-bold text-lg"
              >
                Register Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Register Modal removed in favor of full-page register view */}

      <Footer />
    </>
  );
}
