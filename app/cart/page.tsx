"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { CartItem, getStoredCart, persistCart } from '@/lib/cart';
import { roundMoney } from '@/lib/paymentMath';

const currencySymbols: Record<string, string> = {
  INR: '₹',
  USD: '$',
  NPR: 'Rs',
};

const getCurrencySymbol = (currency: string) => currencySymbols[currency] || currency;

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleQuantityChange = (id: string, newQuantity: number) => {
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

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const items = getStoredCart();
    setCartItems(items);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      persistCart(cartItems);
    }
  }, [cartItems, isLoaded]);

  const handleCheckout = () => {
    if (!cartItems.length) return;

    // Requirement: without signup/signin no payment should be done.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!token || !user) {
      const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/cart';
      router.push(`/signin?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }

    router.push('/checkout');
  };

  // Calculate totals by grouping items by currency
  const calculateTotals = () => {
    const totals: Record<string, { subtotal: number; items: CartItem[] }> = {};
    
    cartItems.forEach((item) => {
      if (!totals[item.currency]) {
        totals[item.currency] = { subtotal: 0, items: [] };
      }
      totals[item.currency].subtotal += item.price * item.quantity;
      totals[item.currency].items.push(item);
    });
    
    return totals;
  };

  const totals = calculateTotals();

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-14 sm:pt-20 pb-6 sm:pb-10">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 md:py-20">
          <button
            onClick={() => router.back()}
            className="mb-4 sm:mb-6 flex items-center gap-2 text-swar-primary hover:text-swar-accent font-semibold transition-colors touch-target active:scale-95 py-2"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Back
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 md:mb-12 text-swar-accent">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              <p className="text-lg sm:text-2xl text-swar-text-secondary mb-6 sm:mb-8">Your cart is empty</p>
              <Link href="/" className="inline-block bg-swar-primary text-white px-6 sm:px-8 py-3 sm:py-3 rounded-lg hover:bg-swar-primary-hover transition touch-target active:scale-95 font-semibold">
                Continue Shopping
              </Link>
              <p className="mt-6 text-swar-text-secondary text-sm sm:text-base">
                Add a workshop from the <Link href="/workshop" className="text-swar-primary underline">workshops page</Link> to start your cart.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                  <table className="w-full text-sm sm:text-base">
                    <thead className="bg-yoga-50 border-b">
                      <tr>
                        <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-swar-accent font-bold text-xs sm:text-sm">Product</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-swar-accent font-bold text-xs sm:text-sm">Price</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-swar-accent font-bold text-xs sm:text-sm">Qty</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-swar-accent font-bold text-xs sm:text-sm">Total</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-swar-accent font-bold text-xs sm:text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.id} className="border-t border-swar-border hover:bg-swar-bg">
                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                              <div className="text-swar-text font-semibold text-xs sm:text-sm line-clamp-2">{item.name}</div>
                              <div className="text-xs text-swar-text-secondary">{item.currency}</div>
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap">{getCurrencySymbol(item.currency)}{item.price.toFixed(0)}</td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  handleQuantityChange(item.id, Number.isNaN(value) ? 1 : value);
                                }}
                                className="w-12 sm:w-14 px-2 py-1 border border-swar-border rounded text-sm touch-target"
                              />
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 font-bold text-xs sm:text-sm whitespace-nowrap">
                              {getCurrencySymbol(item.currency)}{(item.price * item.quantity).toFixed(0)}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800 font-bold text-xs sm:text-sm touch-target active:scale-95 py-1 px-2"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="bg-swar-primary-light rounded-lg p-4 sm:p-6 md:p-8 sticky top-24 md:top-32">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-swar-primary">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6 border-b border-green-200 pb-6 max-h-48 overflow-y-auto">
                    {cartItems.length > 0 ? (
                      cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-swar-text text-sm">
                          <span className="flex-1 truncate mr-2">{item.name} x{item.quantity}</span>
                          <span className="font-semibold whitespace-nowrap">
                            {getCurrencySymbol(item.currency)}{roundMoney(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs sm:text-sm text-swar-text-secondary">
                        Add a workshop to start checkout.
                      </p>
                    )}
                  </div>
                  
                  {cartItems.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {Object.entries(totals).map(([currency, { subtotal }]) => (
                        <div key={currency} className="space-y-1 sm:space-y-2 pb-3 border-b border-green-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-swar-text">Subtotal ({currency})</span>
                            <span className="font-semibold">
                              {getCurrencySymbol(currency)}{roundMoney(subtotal).toFixed(0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-swar-text">3.3% Platform Fee</span>
                            <span className="font-semibold">{getCurrencySymbol(currency)}{roundMoney(subtotal * 0.033).toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-swar-text-secondary my-3 sm:my-4 leading-relaxed">
                    Select payment method (India/International/Nepal) during checkout.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!cartItems.length}
                    className={`w-full py-2.5 sm:py-3 rounded-lg text-center font-bold transition touch-target min-h-12 text-sm sm:text-base mb-2 sm:mb-3 ${
                      cartItems.length
                        ? 'bg-swar-primary text-white hover:bg-swar-primary active:scale-95'
                        : 'bg-gray-300 text-swar-text-secondary cursor-not-allowed'
                    }`}
                  >
                    Proceed to Checkout
                  </button>

                  <Link href="/" className="block w-full border border-yoga-600 text-swar-primary py-2.5 sm:py-3 rounded-lg text-center font-bold hover:bg-yoga-50 transition touch-target min-h-12 text-sm sm:text-base active:scale-95">
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
