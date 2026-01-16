'use client';

import React, { useState } from 'react';
import { useCart } from '@/lib/context/CartContext';

interface AddToCartButtonProps {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  duration?: string;
  maxQuantity?: number;
  className?: string;
  showQuantitySelector?: boolean;
}

export default function AddToCartButton({
  id,
  name,
  price,
  image,
  description,
  duration,
  maxQuantity = 10,
  className = '',
  showQuantitySelector = false,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [showMessage, setShowMessage] = useState(false);

  const handleAddToCart = () => {
    addToCart({
      id,
      name,
      price,
      quantity,
      image,
      description,
      duration,
    });
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000);
  };

  return (
    <div className="space-y-2">
      {showQuantitySelector && (
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg w-fit p-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-200 transition-colors"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-gray-200 transition-colors"
          >
            +
          </button>
        </div>
      )}
      
      <button
        onClick={handleAddToCart}
        className={`${
          className
            ? className
            : 'w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2'
        }`}
      >
        <span>🛒</span>
        <span>Add to Cart</span>
      </button>

      {showMessage && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-center text-sm font-semibold animate-fade-in">
          ✅ Added to cart!
        </div>
      )}
    </div>
  );
}
