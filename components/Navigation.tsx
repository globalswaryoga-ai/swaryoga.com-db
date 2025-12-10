'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container flex justify-between items-center py-4">
        <Link href="/" className="text-2xl font-bold text-yoga-700">
          🧘 Swar Yoga
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex flex-col space-y-1"
        >
          <span className="block w-6 h-0.5 bg-yoga-700"></span>
          <span className="block w-6 h-0.5 bg-yoga-700"></span>
          <span className="block w-6 h-0.5 bg-yoga-700"></span>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8">
          <Link href="/" className="text-gray-700 hover:text-yoga-600 transition font-medium">
            Home
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-yoga-600 transition font-medium">
            About
          </Link>
          <Link href="/contact" className="text-gray-700 hover:text-yoga-600 transition font-medium">
            Contact
          </Link>
          <Link href="/cart" className="text-gray-700 hover:text-yoga-600 transition font-medium">
            🛒 Cart
          </Link>
          <Link href="/signin" className="bg-yoga-600 text-white px-4 py-2 rounded-lg hover:bg-yoga-700 transition">
            Sign In
          </Link>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg md:hidden flex flex-col space-y-4 p-6">
            <Link href="/" className="text-gray-700 hover:text-yoga-600">
              Home
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-yoga-600">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-yoga-600">
              Contact
            </Link>
            <Link href="/cart" className="text-gray-700 hover:text-yoga-600">
              Cart
            </Link>
            <Link href="/signin" className="bg-yoga-600 text-white px-4 py-2 rounded-lg text-center">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
