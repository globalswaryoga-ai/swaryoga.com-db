'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Session {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  duration: number;
  thumbnail: string;
  price: number;
  average_rating: number;
  views: number;
  tags: string[];
  is_featured: boolean;
}

interface SessionCardProps {
  session: Session;
  onPurchase?: (sessionId: string) => void;
}

export default function SessionCard({ session, onPurchase }: SessionCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  const levelColor: Record<string, string> = {
    beginner: 'yoga-100 text-yoga-700',
    intermediate: 'yoga-200 text-yoga-800',
    advanced: 'yoga-300 text-yoga-900',
    'all-levels': 'yoga-50 text-yoga-600',
  };

  const categoryColor: Record<string, string> = {
    yoga: 'bg-blue-100 text-blue-700',
    pranayama: 'bg-green-100 text-green-700',
    meditation: 'bg-purple-100 text-purple-700',
    workshop: 'bg-orange-100 text-orange-700',
    health: 'bg-red-100 text-red-700',
    lifestyle: 'bg-pink-100 text-pink-700',
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-yoga-100 overflow-hidden">
        {session.thumbnail ? (
          <Image
            src={session.thumbnail}
            alt={session.title}
            fill
            className={`object-cover transition-transform duration-300 ${
              isHovering ? 'scale-105' : 'scale-100'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yoga-200 to-yoga-300">
            <span className="text-yoga-600 text-4xl">🧘</span>
          </div>
        )}

        {/* Featured Badge */}
        {session.is_featured && (
          <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
            ⭐ Featured
          </div>
        )}

        {/* Level Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${levelColor[session.level]}`}>
          {session.level.charAt(0).toUpperCase() + session.level.slice(1)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${categoryColor[session.category]}`}>
            {session.category.charAt(0).toUpperCase() + session.category.slice(1)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-yoga-600">
          {session.title}
        </h3>

        {/* Instructor */}
        <p className="text-sm text-gray-600 mb-3">
          👨‍🏫 <span className="font-semibold">{session.instructor}</span>
        </p>

        {/* Duration & Views */}
        <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
          <span>⏱️ {session.duration} min</span>
          <span>👁️ {session.views.toLocaleString()} views</span>
        </div>

        {/* Rating */}
        <div className="flex items-center mb-4">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.round(session.average_rating) ? '⭐' : '☆'}>
                {i < Math.round(session.average_rating) ? '⭐' : '☆'}
              </span>
            ))}
          </div>
          <span className="ml-2 text-sm font-semibold text-gray-700">
            {session.average_rating.toFixed(1)}
          </span>
        </div>

        {/* Tags */}
        {session.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {session.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Price & Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <span className="text-2xl font-bold text-yoga-600">${session.price.toFixed(2)}</span>
          <button
            onClick={() => onPurchase?.(session._id)}
            className="bg-yoga-600 hover:bg-yoga-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Enroll Now
          </button>
        </div>
      </div>
    </div>
  );
}
