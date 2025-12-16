import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  quote: string;
  name: string;
  location: string;
  workshopName: string;
  image?: string;
}

interface TextTestimoniesProps {
  testimonials: Testimonial[];
}

export default function TextTestimonies({ testimonials }: TextTestimoniesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-slide every 5 seconds if not hovered
  useEffect(() => {
    if (isHovered || testimonials.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isHovered, testimonials.length]);

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  const current = testimonials[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          Student Testimonies
        </h2>

        <div
          className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 md:p-12 min-h-72 flex flex-col justify-between"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Testimonial Content */}
          <div className="flex-grow flex flex-col justify-center mb-8">
            {/* Quote */}
            <blockquote className="text-2xl md:text-3xl font-light text-gray-800 mb-8 italic">
              "{current.quote}"
            </blockquote>

            {/* Author Info */}
            <div className="border-t border-gray-300 pt-6">
              <p className="font-semibold text-lg text-gray-900">
                {current.name}
              </p>
              <p className="text-gray-600">
                {current.location}
                {current.workshopName && ` • ${current.workshopName}`}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-full bg-white hover:bg-gray-100 transition shadow-md"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-6 h-6 text-indigo-600" />
            </button>

            {/* Indicators */}
            <div className="flex gap-2 justify-center flex-1">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition ${
                    idx === currentIndex
                      ? 'bg-indigo-600 w-8'
                      : 'bg-gray-300 w-2 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-2 rounded-full bg-white hover:bg-gray-100 transition shadow-md"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-6 h-6 text-indigo-600" />
            </button>
          </div>

          {/* Pause hint */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Hover to pause • Auto-rotates every 5 seconds
          </p>
        </div>
      </div>
    </section>
  );
}
