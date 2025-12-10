'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">🧘 Swar Yoga</h3>
            <p className="text-gray-400">
              Transform your life through authentic yoga teachings and premium wellness products.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Account</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/signin" className="hover:text-white transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Admin</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/admin/login" className="hover:text-white transition inline-flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
                  <span>🔐</span>
                  <span>Admin Login</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4">Contact Info</h4>
            <p className="text-gray-400 mb-2">hello@swaryoga.com</p>
            <p className="text-gray-400">+1 (234) 567-890</p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <p>&copy; {currentYear} Swar Yoga. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
