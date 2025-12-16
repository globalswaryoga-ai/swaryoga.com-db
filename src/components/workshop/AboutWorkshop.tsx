import React from 'react';
import { BookOpen, Users, Zap } from 'lucide-react';

interface AboutWorkshopProps {
  image: string;
  title: string;
  description: string;
  whatYouWillLearn: string[];
  whoIsItFor: string[];
  duration: string;
  level: string;
}

export default function AboutWorkshop({
  image,
  title,
  description,
  whatYouWillLearn,
  whoIsItFor,
  duration,
  level
}: AboutWorkshopProps) {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          About This Workshop
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Column: Image */}
          <div className="flex justify-center">
            <img
              src={image}
              alt={title}
              className="w-full max-w-md h-auto rounded-lg shadow-lg object-cover aspect-video lazy-load"
              loading="lazy"
            />
          </div>

          {/* Right Column: Content */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <p className="text-lg text-gray-700 leading-relaxed">
                {description}
              </p>
            </div>

            {/* What You Will Learn */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                What You Will Learn
              </h3>
              <ul className="space-y-2">
                {whatYouWillLearn.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-indigo-600 font-bold mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Who Is It For */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Who This Workshop Is For
              </h3>
              <ul className="space-y-2">
                {whoIsItFor.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-indigo-600 font-bold mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Duration & Level */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-semibold text-gray-900">{duration}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{level}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
