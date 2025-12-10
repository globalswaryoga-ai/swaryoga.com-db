'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-950 text-white mt-20 border-t-4 border-accent-500">
      <div className="container py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-4 bg-gradient-eco bg-clip-text text-transparent">🧘 Swar Yoga</h3>
            <p className="text-neutral-300">
              Transform your life through authentic yoga teachings and premium wellness products.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-300">Quick Links</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/" className="hover:text-primary-300 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary-300 transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary-300 transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-300">Account</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/signin" className="hover:text-primary-300 transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary-300 transition">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-primary-300 transition">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-300">Admin</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/login" className="hover:bg-primary-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 bg-secondary-600 hover:bg-secondary-700 transition shadow-eco">
                  <span>🔐</span>
                  <span>Admin Login</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-300">Contact Info</h4>
            <p className="text-neutral-400 mb-2">hello@swaryoga.com</p>
            <p className="text-neutral-400">+1 (234) 567-890</p>
          </div>
        </div>

        <div className="border-t border-primary-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-neutral-400 text-sm">
            <p>&copy; {currentYear} Swar Yoga. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary-300 transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-primary-300 transition">
                Terms of Service
              </a>
              <a href="#" className="hover:text-primary-300 transition">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
