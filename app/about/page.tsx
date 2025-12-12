'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Award, Heart, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function About() {
  const values = [
    {
      icon: <Heart size={30} className="text-coral-rose-600" />,
      title: 'Compassion',
      description: 'We approach every student with kindness and understanding, creating a supportive environment for growth.'
    },
    {
      icon: <Award size={30} className="text-earth-brown-600" />,
      title: 'Authenticity',
      description: 'We honor the ancient traditions of yoga while making them accessible and relevant for modern practitioners.'
    },
    {
      icon: <Users size={30} className="text-teal-accent-600" />,
      title: 'Community',
      description: 'We foster a sense of belonging where everyone can share their journey and support each other.'
    }
  ];

  const achievements = [
    { number: '25+', label: 'Years of Experience' },
    { number: '8,000+', label: 'Students Trained' },
    { number: '20+', label: 'Certified Teachers' },
    { number: '15+', label: 'Countries Reached' }
  ];

  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-primary-50 to-white overflow-hidden">
        {/* Background Nature Image */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src="https://images.pexels.com/photos/1134295/pexels-photo-1134295.jpeg"
            alt="Nature sky background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/80"></div>
        </div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">About Swar Yoga</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the transformative power of authentic yoga and sound healing
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-primary-600">Our Mission & Vision</h2>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                At Swar Yoga, we are dedicated to preserving and sharing the transformative 
                practice of yoga through sound and breath. Our mission is to empower individuals 
                to discover their inner harmony and achieve holistic well-being through authentic yoga practices.
              </p>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                We envision a world where the ancient wisdom of Swar Yoga is accessible to all, 
                creating a global community of practitioners who experience deeper awareness, 
                improved health, and spiritual growth.
              </p>
              <div className="p-6 bg-primary-50 rounded-lg border-l-4 border-primary-600">
                <p className="italic text-gray-700 text-lg">
                  "Swar Yoga is not just a practice, but a way of life that harmonizes 
                  our inner vibrations with the universal rhythm."
                </p>
                <p className="mt-3 font-semibold text-primary-700">- Mohan Kalburgi, Founder</p>
              </div>
            </div>
            
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img 
                src="https://i.postimg.cc/NFfcBfkC/temp-Imageu-NC5-GN.avif"
                alt="Yoga meditation" 
                className="w-full h-auto object-cover filter brightness-110 contrast-110 saturate-110"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img
                src="https://i.postimg.cc/3RfL08Hc/temp-Image-N5-TSEG.avif"
                alt="Yogacharya Mohan Kalburgi"
                className="rounded-lg shadow-xl w-full h-[500px] object-cover"
              />
            </div>
            
            <div className="order-1 md:order-2">
              <h2 className="text-4xl font-bold mb-4 text-gray-900">Meet Our Founder</h2>
              <h3 className="text-2xl text-primary-600 font-semibold mb-6">Yogacharya Mohan Kalburgi</h3>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                With over 25 years of dedicated practice and teaching experience, Yogacharya Mohan Kalburgi 
                has transformed thousands of lives through the ancient wisdom of Swar Yoga. His journey 
                began in the sacred valleys of the Himalayas, where he learned from master practitioners.
              </p>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                As a renowned expert in Swar Yoga, he has conducted workshops across India and internationally, 
                bringing the transformative power of yoga to practitioners worldwide. His unique approach 
                combines traditional teachings with modern understanding, making yoga accessible to everyone.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-primary-600 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-600 text-lg">Certified Yoga Master with international recognition</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-primary-600 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-600 text-lg">Author of multiple books on yoga and wellness</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-primary-600 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-600 text-lg">Featured speaker at global yoga conferences</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-20 bg-primary-700 text-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Achievements</h2>
            <p className="max-w-2xl mx-auto text-primary-100 text-lg">
              Over two decades of dedication to spreading the wisdom of yoga
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-lg bg-primary-600 hover:bg-primary-800 transition-colors"
              >
                <div className="text-5xl font-bold mb-3">{achievement.number}</div>
                <div className="text-primary-100 text-lg">{achievement.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Our Core Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              These principles guide everything we do at Swar Yoga
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center p-8 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="inline-flex p-4 bg-primary-100 rounded-full mb-6">
                  {value.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{value.title}</h3>
                <p className="text-gray-600 text-lg leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Join Us Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Join Our Community</h2>
          <p className="max-w-2xl mx-auto mb-10 text-primary-100 text-lg leading-relaxed">
            Experience the transformative power of Swar Yoga and connect with like-minded 
            individuals on the path to wellness and inner harmony.
          </p>
          <Link 
            href="/contact" 
            className="inline-flex items-center px-8 py-4 bg-white text-primary-600 hover:bg-primary-50 rounded-lg transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Get in Touch
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
