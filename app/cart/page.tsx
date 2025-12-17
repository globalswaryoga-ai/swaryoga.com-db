"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { CartCurrency, CartItem, getStoredCart, persistCart } from '@/lib/cart';
import { ChargeMethod, convertAmount, getChargeRate, roundMoney } from '@/lib/paymentMath';

const currencySymbols: Record<CartCurrency, string> = {
  INR: '₹',
  USD: '$',
  NPR: 'Rs',
};

const getCurrencySymbol = (currency: CartCurrency) => currencySymbols[currency];

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [chargeMethod, setChargeMethod] = useState<ChargeMethod>('indian');

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

  const [selectedCurrency, setSelectedCurrency] = useState<CartItem['currency']>('INR');

  useEffect(() => {
    if (!cartItems.length) return;
    if (!cartItems.some((item) => item.currency === selectedCurrency)) {
      setSelectedCurrency(cartItems[0].currency);
    }
  }, [cartItems, selectedCurrency]);

  const effectiveChargeMethod: ChargeMethod =
    selectedCurrency === 'NPR'
      ? 'nepal_qr'
      : selectedCurrency === 'USD'
        ? 'international'
        : chargeMethod;

  const summaryItems = cartItems;
  const summarySubtotal = roundMoney(
    summaryItems.reduce((sum, item) => {
      const line = item.price * item.quantity;
      return sum + convertAmount(line, item.currency as any, selectedCurrency as any);
    }, 0)
  );
  const chargeRate = getChargeRate(effectiveChargeMethod);
  const summaryCharges = roundMoney(summarySubtotal * chargeRate);
  const summaryTotal = roundMoney(summarySubtotal + summaryCharges);
  const hasItemsForSelectedCurrency = summaryItems.length > 0;

  const handleCheckout = () => {
    if (!hasItemsForSelectedCurrency) return;

    // Requirement: without signup/signin no payment should be done.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!token || !user) {
      const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/cart';
      router.push(`/signin?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }

    router.push(`/checkout?currency=${selectedCurrency}&method=${encodeURIComponent(effectiveChargeMethod)}`);
  };

  const currencyOptions = [
    { code: 'INR' as CartItem['currency'], label: 'India' },
    { code: 'NPR' as CartItem['currency'], label: 'Nepal' },
    { code: 'USD' as CartItem['currency'], label: 'International' },
  ];

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-14 sm:pt-20 pb-6 sm:pb-10">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 md:py-20">
          <button
            onClick={() => router.back()}
            className="mb-4 sm:mb-6 flex items-center gap-2 text-yoga-600 hover:text-yoga-700 font-semibold transition-colors touch-target active:scale-95 py-2"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Back
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 md:mb-12 text-yoga-700">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              <p className="text-lg sm:text-2xl text-gray-600 mb-6 sm:mb-8">Your cart is empty</p>
              <Link href="/" className="inline-block bg-yoga-600 text-white px-6 sm:px-8 py-3 sm:py-3 rounded-lg hover:bg-yoga-700 transition touch-target active:scale-95 font-semibold">
                Continue Shopping
              </Link>
              <p className="mt-6 text-gray-500 text-sm sm:text-base">
                Add a workshop from the <Link href="/workshop" className="text-yoga-600 underline">workshops page</Link> to start your cart.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                  <table className="w-full text-sm sm:text-base">
                    <thead className="bg-yoga-50 border-b">
                      <tr>
                        <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-yoga-700 font-bold text-xs sm:text-sm">Product</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-yoga-700 font-bold text-xs sm:text-sm">Price</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-yoga-700 font-bold text-xs sm:text-sm">Qty</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-yoga-700 font-bold text-xs sm:text-sm">Total</th>
                        <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-yoga-700 font-bold text-xs sm:text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                              <div className="text-gray-800 font-semibold text-xs sm:text-sm line-clamp-2">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.currency}</div>
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
                                className="w-12 sm:w-14 px-2 py-1 border border-gray-300 rounded text-sm touch-target"
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
                <div className="mt-4 sm:mt-6 rounded-2xl bg-white shadow-sm px-4 sm:px-6 py-4 sm:py-5">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Pick a currency to checkout</p>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {currencyOptions.map((option) => {
                      const isSelected = selectedCurrency === option.code;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => setSelectedCurrency(option.code)}
                          aria-pressed={isSelected}
                          className={`rounded-2xl border px-3 sm:px-4 py-2 text-xs font-semibold tracking-wide uppercase transition touch-target active:scale-95 ${
                            isSelected
                              ? 'border-red-600 bg-red-600 text-white shadow-md'
                              : 'border-red-200 bg-red-50 text-red-700 hover:border-red-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {selectedCurrency === 'INR' && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Payment method charges</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setChargeMethod('indian')}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                            chargeMethod === 'indian'
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Indian (2.5%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setChargeMethod('credit_card')}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                            chargeMethod === 'credit_card'
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Credit Card (5%)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="bg-green-50 rounded-lg p-4 sm:p-6 md:p-8 sticky top-24 md:top-32">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-green-700">Order Summary</h2>
                  
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 border-b border-green-200 pb-4 sm:pb-6 max-h-48 overflow-y-auto">
                    {summaryItems.length > 0 ? (
                      summaryItems.map((item) => (
                        <div key={`${item.id}-${item.currency}`} className="flex justify-between text-gray-700 text-sm">
                          <span className="flex-1 truncate mr-2">{item.name} x{item.quantity}</span>
                          <span className="font-semibold whitespace-nowrap">
                            {getCurrencySymbol(selectedCurrency)}{roundMoney(convertAmount(item.price * item.quantity, item.currency as any, selectedCurrency as any)).toFixed(0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-600">
                        Add a workshop for {selectedCurrency} to start checkout.
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="font-semibold">
                        {getCurrencySymbol(selectedCurrency)}{summarySubtotal.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Charges ({Math.round(chargeRate * 1000) / 10}%)</span>
                      <span className="font-semibold">{getCurrencySymbol(selectedCurrency)}{summaryCharges.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between py-2 sm:py-3 border-t border-green-200">
                    <span className="text-base sm:text-lg font-bold text-red-600">Total</span>
                    <span className="text-lg sm:text-2xl font-bold text-green-600">
                      {getCurrencySymbol(selectedCurrency)}{summaryTotal.toFixed(0)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 my-3 sm:my-4 leading-relaxed">
                    Continue to our secure PayU checkout with the selected currency.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!hasItemsForSelectedCurrency}
                    className={`w-full py-2.5 sm:py-3 rounded-lg text-center font-bold transition touch-target min-h-12 text-sm sm:text-base mb-2 sm:mb-3 ${
                      hasItemsForSelectedCurrency
                        ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Checkout ({selectedCurrency})
                  </button>

                  <Link href="/" className="block w-full border border-yoga-600 text-yoga-600 py-2.5 sm:py-3 rounded-lg text-center font-bold hover:bg-yoga-50 transition touch-target min-h-12 text-sm sm:text-base active:scale-95">
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
