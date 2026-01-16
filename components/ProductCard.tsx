'use client';

import React from 'react';
import AddToCartButton from '@/components/AddToCartButton';

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  duration?: string;
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  instructorName?: string;
  rating?: number;
  reviews?: number;
  students?: number;
  onAddToCart?: (id: string, name: string, price: number) => void;
}

export default function ProductCard({
  id,
  name,
  description,
  price,
  image,
  duration,
  level = 'Beginner',
  instructorName,
  rating = 4.5,
  reviews = 0,
  students = 0,
  onAddToCart,
}: ProductCardProps) {
  return (
    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-yoga-200 to-yoga-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🧘</div>
        )}
        
        {/* Level Badge */}
        <div className="absolute top-4 right-4 bg-yoga-600 text-white px-3 py-1 rounded-full text-xs font-bold">
          {level}
        </div>

        {/* Popular Badge (if students > 500) */}
        {students > 500 && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <span>⭐</span> Popular
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{name}</h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>

        {/* Instructor */}
        {instructorName && (
          <p className="text-yoga-600 text-sm font-semibold mb-3">👨‍🏫 {instructorName}</p>
        )}

        {/* Meta Information */}
        <div className="flex items-center justify-between mb-4 text-xs text-gray-600">
          {duration && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{duration}</span>
            </div>
          )}
          
          {rating > 0 && (
            <div className="flex items-center gap-1">
              <span>⭐</span>
              <span className="font-semibold">{rating}</span>
              {reviews > 0 && <span>({reviews} reviews)</span>}
            </div>
          )}

          {students > 0 && (
            <div className="flex items-center gap-1">
              <span>👥</span>
              <span>{(students / 1000).toFixed(1)}K students</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-4 border-t"></div>

        {/* Price Section */}
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-gray-600 text-xs">Starting at</p>
            <p className="text-3xl font-bold text-yoga-600">₹{price.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>One-time payment</p>
            <p className="font-semibold">Lifetime access</p>
          </div>
        </div>

        {/* Add to Cart Button */}
        <AddToCartButton
          id={id}
          name={name}
          price={price}
          description={description}
          duration={duration}
          className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        />

        {/* Features */}
        <div className="mt-6 pt-6 border-t space-y-2 text-xs text-gray-600">
          <p className="flex items-center gap-2">
            <span>✅</span> <span>Lifetime Access</span>
          </p>
          <p className="flex items-center gap-2">
            <span>📱</span> <span>Mobile & Desktop</span>
          </p>
          <p className="flex items-center gap-2">
            <span>🏆</span> <span>Certificate Included</span>
          </p>
        </div>
      </div>
    </div>
  );
}
