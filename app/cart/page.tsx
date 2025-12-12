"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { CartCurrency, CartItem, getStoredCart, persistCart } from '@/lib/cart';

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

  const summaryItems = cartItems.filter((item) => item.currency === selectedCurrency);
  const summarySubtotal = summaryItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const summaryTax = summarySubtotal * 0.08;
  const summaryTotal = summarySubtotal + summaryTax;
  const hasItemsForSelectedCurrency = summaryItems.length > 0;

  const handleCheckout = () => {
    if (!hasItemsForSelectedCurrency) return;
    router.push(`/checkout?currency=${selectedCurrency}`);
  };

  const currencyOptions = [
    { code: 'INR' as CartItem['currency'], label: 'India' },
    { code: 'NPR' as CartItem['currency'], label: 'Nepal' },
    { code: 'USD' as CartItem['currency'], label: 'International' },
  ];

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20">
        <div className="container py-20">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-yoga-600 hover:text-yoga-700 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-5xl font-bold mb-12 text-yoga-700">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-2xl text-gray-600 mb-8">Your cart is empty</p>
              <Link href="/" className="bg-yoga-600 text-white px-8 py-3 rounded-lg hover:bg-yoga-700 transition">
                Continue Shopping
              </Link>
              <p className="mt-6 text-gray-500">
                Add a workshop from the <Link href="/workshops" className="text-yoga-600 underline">workshops page</Link> to start your cart.
              </p>
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
                            <td className="px-6 py-4">
                              <div className="text-gray-800 font-semibold">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.currency}</div>
                            </td>
                            <td className="px-6 py-4">{getCurrencySymbol(item.currency)}{item.price.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  handleQuantityChange(item.id, Number.isNaN(value) ? 1 : value);
                                }}
                                className="w-16 px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {getCurrencySymbol(item.currency)}{(item.price * item.quantity).toFixed(2)}
                            </td>
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
                <div className="mt-6 rounded-2xl bg-white shadow-sm px-6 py-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Pick a currency to checkout</p>
                  <div className="flex flex-wrap gap-3">
                    {currencyOptions.map((option) => {
                      const isSelected = selectedCurrency === option.code;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => setSelectedCurrency(option.code)}
                          aria-pressed={isSelected}
                          className={`rounded-2xl border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition ${
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
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="bg-green-50 rounded-lg p-8 sticky top-24">
                  <h2 className="text-2xl font-bold mb-6 text-green-700">Order Summary</h2>
                  
                  <div className="space-y-4 mb-6 border-b border-green-200 pb-6">
                    {summaryItems.length > 0 ? (
                      summaryItems.map((item) => (
                        <div key={`${item.id}-${item.currency}`} className="flex justify-between text-gray-700">
                          <span>{item.name} x{item.quantity}</span>
                          <span className="font-semibold">
                            {getCurrencySymbol(item.currency)}{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">
                        Add a workshop for {selectedCurrency} to start checkout.
                      </p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="font-semibold">
                        {getCurrencySymbol(selectedCurrency)}{summarySubtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tax (8%)</span>
                      <span className="font-semibold">
                        {getCurrencySymbol(selectedCurrency)}{summaryTax.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between mb-2">
                    <span className="text-xl font-bold text-red-600">Total</span>
                    <span className="text-2xl font-bold text-green-600">
                      {getCurrencySymbol(selectedCurrency)}{summaryTotal.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Continue to our secure PayU checkout (using the configured merchant key & salt) with the selected currency.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!hasItemsForSelectedCurrency}
                    className={`mt-6 block w-full py-3 rounded-lg text-center font-bold mb-4 transition ${
                      hasItemsForSelectedCurrency
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Checkout via PayU ({selectedCurrency})
                  </button>

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
