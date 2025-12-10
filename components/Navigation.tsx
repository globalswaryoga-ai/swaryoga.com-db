'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-primary-100">
      <div className="container flex justify-between items-center py-4">
        <Link href="/" className="text-3xl font-bold bg-gradient-eco bg-clip-text text-transparent hover:opacity-80 transition">
          🧘 Swar Yoga
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex flex-col space-y-1"
        >
          <span className="block w-6 h-0.5 bg-primary-700"></span>
          <span className="block w-6 h-0.5 bg-primary-700"></span>
          <span className="block w-6 h-0.5 bg-primary-700"></span>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8 items-center">
          <Link href="/" className="text-neutral-700 hover:text-primary-600 transition font-medium">
            Home
          </Link>
          <Link href="/about" className="text-neutral-700 hover:text-primary-600 transition font-medium">
            About
          </Link>
          <Link href="/contact" className="text-neutral-700 hover:text-primary-600 transition font-medium">
            Contact
          </Link>
          <Link href="/cart" className="text-neutral-700 hover:text-primary-600 transition font-medium">
            🛒 Cart
          </Link>
          <Link href="/signin" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition shadow-eco font-medium">
            Sign In
          </Link>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg md:hidden flex flex-col space-y-4 p-6 border-t-2 border-primary-100">
            <Link href="/" className="text-neutral-700 hover:text-primary-600">
              Home
            </Link>
            <Link href="/about" className="text-neutral-700 hover:text-primary-600">
              About
            </Link>
            <Link href="/contact" className="text-neutral-700 hover:text-primary-600">
              Contact
            </Link>
            <Link href="/cart" className="text-neutral-700 hover:text-primary-600">
              Cart
            </Link>
            <Link href="/signin" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-center hover:bg-primary-700 transition">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
