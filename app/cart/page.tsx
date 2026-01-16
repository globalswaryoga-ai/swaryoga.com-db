'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useCart } from '@/lib/context/CartContext';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, getTotals } = useCart();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { subtotal, tax, total } = getTotals();

  if (!isClient) {
    return <div>Loading...</div>;
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 py-16">
            {/* Empty Cart */}
            <div className="max-w-2xl mx-auto text-center py-16">
              <ShoppingCart className="w-24 h-24 mx-auto text-gray-400 mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
              <p className="text-gray-600 mb-8 text-lg">
                Start exploring our workshops and add them to your cart to get started.
              </p>
              <Link
                href="/workshops"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
              >
                Continue Shopping
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-12">Shopping Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items - Left Column */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-6 pb-6 border-b last:border-b-0 last:pb-0">
                      {/* Item Image/Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gradient-to-br from-yoga-600 to-yoga-700 rounded-lg flex items-center justify-center text-white text-2xl">
                          📚
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                        {item.metadata?.registeredName && (
                          <p className="text-sm text-gray-600 mb-2">
                            Registered: {item.metadata.registeredName}
                          </p>
                        )}
                        {item.metadata?.level && (
                          <p className="text-sm text-gray-600">Level: {item.metadata.level}</p>
                        )}
                        {item.metadata?.instructor && (
                          <p className="text-sm text-gray-600">Instructor: {item.metadata.instructor}</p>
                        )}
                      </div>

                      {/* Price & Actions */}
                      <div className="flex flex-col items-end gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Price</div>
                          <div className="text-2xl font-bold text-yoga-600">
                            ₹{item.price.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Continue Shopping */}
                <div className="mt-8 pt-6 border-t">
                  <Link
                    href="/workshops"
                    className="inline-flex items-center gap-2 text-yoga-600 hover:text-yoga-700 font-semibold"
                  >
                    ← Continue Shopping
                  </Link>
                </div>
              </div>
            </div>

            {/* Cart Summary - Right Column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 sticky top-24">
                {/* Summary Header */}
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

                {/* Summary Items */}
                <div className="space-y-4 mb-6 pb-6 border-b">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-gray-700">
                    <span>Service Charges (2.5%)</span>
                    <span className="font-semibold">₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-bold text-yoga-600">
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={() => router.push('/checkout-enhanced')}
                  className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white font-bold py-4 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl mb-4"
                >
                  💳 Proceed to Checkout
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Security Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-900">
                    🔒 <strong>Secure Checkout</strong> - Your payment is safe with Cashfree
                  </p>
                </div>

                {/* Features */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm text-gray-700">Lifetime access to materials</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm text-gray-700">Certificate upon completion</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm text-gray-700">24/7 expert support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
