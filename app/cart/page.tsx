'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: 1, name: 'Yoga Mat Premium', price: 99.99, quantity: 1 },
    { id: 2, name: 'Meditation Cushion', price: 49.99, quantity: 2 },
  ]);

  const handleQuantityChange = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    setCartItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20">
        <div className="container py-20">
          <h1 className="text-5xl font-bold mb-12 text-yoga-700">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-2xl text-gray-600 mb-8">Your cart is empty</p>
              <Link href="/" className="bg-yoga-600 text-white px-8 py-3 rounded-lg hover:bg-yoga-700 transition">
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-yoga-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-yoga-700 font-bold">Product</th>
                        <th className="px-6 py-4 text-left text-yoga-700 font-bold">Price</th>
                        <th className="px-6 py-4 text-left text-yoga-700 font-bold">Quantity</th>
                        <th className="px-6 py-4 text-left text-yoga-700 font-bold">Total</th>
                        <th className="px-6 py-4 text-left text-yoga-700 font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.id} className="border-t border-gray-200">
                          <td className="px-6 py-4">{item.name}</td>
                          <td className="px-6 py-4">${item.price.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold">${(item.price * item.quantity).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-800 font-bold"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="bg-yoga-50 rounded-lg p-8 sticky top-24">
                  <h2 className="text-2xl font-bold mb-6 text-yoga-700">Order Summary</h2>
                  
                  <div className="space-y-4 mb-6 border-b border-yoga-200 pb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="font-semibold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tax (8%)</span>
                      <span className="font-semibold">${tax.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between mb-8">
                    <span className="text-xl font-bold text-yoga-700">Total</span>
                    <span className="text-2xl font-bold text-yoga-600">${total.toFixed(2)}</span>
                  </div>

                  <Link href="/checkout" className="block w-full bg-yoga-600 text-white py-3 rounded-lg text-center font-bold hover:bg-yoga-700 transition mb-4">
                    Proceed to Checkout
                  </Link>

                  <Link href="/" className="block w-full border border-yoga-600 text-yoga-600 py-3 rounded-lg text-center font-bold hover:bg-yoga-50 transition">
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
