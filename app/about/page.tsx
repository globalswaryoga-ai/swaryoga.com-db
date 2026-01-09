'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Award, Heart, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function About() {
  const values = [
    {
      icon: <Heart size={30} />,
      title: 'Compassion',
      description: 'We approach every student with kindness and understanding, creating a supportive environment for growth.'
    },
    {
      icon: <Award size={30} />,
      title: 'Authenticity',
      description: 'We honor the ancient traditions of yoga while making them accessible and relevant for modern practitioners.'
    },
    {
      icon: <Users size={30} />,
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
      
      {/* NEW: Modern High-Impact About Hero */}
      <section className="relative pt-32 pb-20 bg-white overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-swar-primary/5 -skew-x-12 translate-x-1/4 z-0 hidden lg:block" />
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-swar-accent/5 rounded-full blur-3xl z-0" />

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl text-center lg:text-left animate-fade-in-up">
              <div className="inline-flex items-center gap-2 py-1.5 px-6 rounded-full bg-swar-primary/10 text-swar-primary font-bold text-xs md:text-sm mb-8 tracking-[0.2em] uppercase border border-swar-primary/20">
                OUR JOURNEY
              </div>
              
              <h1 className="text-6xl md:text-9xl font-black text-swar-text mb-8 tracking-tighter leading-[0.85]">
                About <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-swar-primary to-swar-accent">
                  Swar Yoga
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-swar-text-secondary leading-snug mb-10 font-medium tracking-tight">
                Discover the transformative power of authentic yoga and sound healing. 
                We bring <span className="text-swar-primary text-italic">ancient wisdom</span> to modern lives.
              </p>

              {/* Achievement Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-8 border-y border-gray-100">
                {achievements.map((item, idx) => (
                  <div key={idx} className="text-center lg:text-left">
                    <div className="text-3xl font-black text-swar-primary">{item.number}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-swar-text-tertiary mt-1">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Side */}
            <div className="relative animate-fade-in-right">
              <div className="relative z-10 aspect-[4/5] rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] border-8 border-white group">
                <img 
                  src="https://images.pexels.com/photos/1134295/pexels-photo-1134295.jpeg"
                  alt="Nature sky background" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-swar-primary/40 via-transparent to-transparent opacity-60" />
              </div>
              
              {/* Floating Award Badge */}
              <div className="absolute -bottom-8 -right-8 z-20 bg-white p-8 rounded-[2.5rem] shadow-2xl border border-swar-primary/10 animate-soft-pulse">
                <div className="flex items-center gap-5">
                  <div className="bg-swar-accent text-white p-4 rounded-2xl shadow-lg shadow-swar-accent/20">
                    <Award size={32} />
                  </div>
                  <div>
                    <div className="text-swar-text font-black text-2xl">25+</div>
                    <div className="text-swar-text-tertiary text-[10px] font-extrabold uppercase tracking-widest">Years Mastery</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6 md:space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-swar-text leading-tight">
                  Our Mission <br />
                  <span className="text-swar-primary">& Vision</span>
                </h2>
                <div className="h-1.5 w-20 bg-swar-accent rounded-full mb-8"></div>
              </div>
              
              <div className="space-y-6">
                <p className="text-swar-text-secondary text-lg md:text-xl leading-relaxed">
                  At Swar Yoga, we are dedicated to preserving and sharing the transformative 
                  practice of yoga through sound and breath. Our mission is to empower individuals 
                  to discover their inner harmony and achieve holistic well-being through authentic yoga practices.
                </p>
                <p className="text-swar-text-secondary text-lg md:text-xl leading-relaxed">
                  We envision a world where the ancient wisdom of Swar Yoga is accessible to all, 
                  creating a global community of practitioners who experience deeper awareness, 
                  improved health, and spiritual growth.
                </p>
              </div>

              <div className="p-8 bg-swar-bg rounded-2xl border-l-[6px] border-swar-primary shadow-sm hover:shadow-md transition-shadow">
                <p className="italic text-swar-text text-xl md:text-2xl font-medium leading-relaxed">
                  "Swar Yoga is not just a practice, but a way of life that harmonizes 
                  our inner vibrations with the universal rhythm."
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="h-0.5 w-10 bg-swar-primary/30"></div>
                  <p className="font-bold text-swar-primary text-lg leading-none">Mohan Kalburgi, Founder</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-swar-accent/10 rounded-full -z-10 animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-swar-primary/5 rounded-full -z-10 animate-pulse delay-700"></div>
              <div className="rounded-3xl overflow-hidden shadow-2xl relative z-10 aspect-[4/5] lg:aspect-auto">
                <img 
                  src="https://i.postimg.cc/NFfcBfkC/temp-Imageu-NC5-GN.avif"
                  alt="Yoga meditation" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 filter brightness-105"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-24 bg-swar-bg overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-swar-primary/10 rounded-3xl rotate-3 transform"></div>
              <img
                src="https://i.postimg.cc/3RfL08Hc/temp-Image-N5-TSEG.avif"
                alt="Yogacharya Mohan Kalburgi"
                className="relative z-10 rounded-3xl shadow-xl w-full h-[600px] object-cover border-4 border-white"
              />
              <div className="absolute -bottom-10 -right-10 hidden lg:block z-20">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-swar-primary/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-swar-primary/10 p-3 rounded-xl">
                      <Award className="text-swar-primary" size={32} />
                    </div>
                    <div>
                      <p className="text-swar-primary font-bold text-2xl leading-none">25+</p>
                      <p className="text-swar-text-tertiary text-sm font-medium">Years Experience</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <span className="text-swar-accent font-bold tracking-widest text-sm mb-2 block uppercase">MEET OUR FOUNDER</span>
                <h2 className="text-4xl md:text-5xl font-bold mb-2 text-swar-text">Yogacharya</h2>
                <h3 className="text-3xl md:text-4xl text-swar-primary font-bold">Mohan Kalburgi</h3>
              </div>

              <div className="space-y-6">
                <p className="text-swar-text-secondary text-lg md:text-xl leading-relaxed">
                  With over 25 years of dedicated practice and teaching experience, Yogacharya Mohan Kalburgi 
                  has transformed thousands of lives through the ancient wisdom of Swar Yoga. His journey 
                  began in the sacred valleys of the Himalayas, where he learned from master practitioners.
                </p>
                <p className="text-swar-text-secondary text-lg md:text-xl leading-relaxed">
                  As a renowned expert in Swar Yoga, he has conducted workshops across India and internationally, 
                  bringing the transformative power of yoga to practitioners worldwide. His unique approach 
                  combines traditional teachings with modern understanding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                {[
                  "Certified Yoga Master with international recognition",
                  "Author of multiple books on yoga and wellness",
                  "Featured speaker at global yoga conferences"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 group">
                    <div className="flex-shrink-0 bg-white shadow-sm border border-swar-primary/10 p-2 rounded-lg group-hover:bg-swar-primary group-hover:text-white transition-colors">
                      <CheckCircle2 size={18} className="text-swar-primary group-hover:text-white" />
                    </div>
                    <p className="text-swar-text font-medium text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-24 bg-swar-primary text-white relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/3"></div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Impact in Numbers</h2>
            <div className="h-1.5 w-24 bg-swar-accent mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="group text-center p-10 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="text-5xl md:text-6xl font-extrabold mb-4 tabular-nums tracking-tighter group-hover:scale-110 transition-transform duration-300">
                  {achievement.number}
                </div>
                <div className="text-swar-primary-light/80 text-lg md:text-xl font-medium uppercase tracking-widest px-2">
                  {achievement.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-20">
            <span className="text-swar-primary font-bold text-sm tracking-[0.2em] uppercase mb-4 block">WHY WE EXIST</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-swar-text">Our Core Values</h2>
            <p className="text-swar-text-secondary max-w-2xl mx-auto text-xl leading-relaxed">
              These shared principles are the heartbeat of everything we create and practice.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {values.map((value, index) => (
              <div
                key={index}
                className="group p-10 bg-swar-bg rounded-[2.5rem] border border-transparent hover:border-swar-primary/10 hover:bg-white hover:shadow-2xl transition-all duration-500"
              >
                <div className="inline-flex p-6 bg-white shadow-lg rounded-2xl mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 group-hover:bg-swar-primary-light">
                  {/* Styling for icons */}
                  {React.cloneElement(value.icon as React.ReactElement<any>, { 
                    size: 40,
                    className: "text-swar-primary"
                  })}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-swar-text group-hover:text-swar-primary transition-colors">{value.title}</h3>
                <p className="text-swar-text-secondary text-lg leading-relaxed group-hover:text-swar-text transition-colors">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Join Us Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-swar-primary to-swar-primary-hover p-12 md:p-20 text-center text-white shadow-2xl">
            {/* Shapes for background aesthetic */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">Ready to start your journey?</h2>
              <p className="text-xl md:text-2xl mb-12 text-swar-primary-light/90 leading-relaxed font-light">
                Experience the transformative power of Swar Yoga and connect with a global community
                on the path to wellness and inner harmony.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link 
                  href="/contact" 
                  className="w-full sm:w-auto px-10 py-5 bg-white text-swar-primary hover:bg-swar-primary-light rounded-2xl transition-all font-bold text-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:scale-95"
                >
                  Get in Touch
                </Link>
                <Link 
                  href="/courses" 
                  className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-white/30 hover:border-white text-white rounded-2xl transition-all font-bold text-xl"
                >
                  Explore Courses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
