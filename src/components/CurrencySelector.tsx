import React, { useState, useEffect } from 'react';
import { DollarSign, X } from 'lucide-react';

export type Currency = 'INR' | 'USD' | 'NPR';

interface CurrencySelectorProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  prices: { INR: number; USD: number; NPR: number };
}

export default function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  prices
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currencies: { code: Currency; name: string; symbol: string }[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'NPR', name: 'Nepali Rupee', symbol: 'Rs' }
  ];

  const currentCurrency = currencies.find((c) => c.code === selectedCurrency);
  const currentPrice = prices[selectedCurrency];

  return (
    <div className="fixed left-0 top-20 z-40">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-r-lg shadow-lg flex items-center gap-2 transition-all"
        aria-label="Toggle currency selector"
      >
        <DollarSign className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-medium">
          {currentCurrency?.symbol} {selectedCurrency}
        </span>
      </button>

      {/* Currency Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white shadow-2xl rounded-lg overflow-hidden min-w-56">
          <div className="bg-green-600 text-white p-4 flex items-center justify-between">
            <h3 className="font-semibold">Select Currency</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-green-700 p-1 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 space-y-1">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  onCurrencyChange(currency.code);
                  setIsOpen(false);
                  // Store currency preference
                  localStorage.setItem('preferredCurrency', currency.code);
                }}
                className={`w-full text-left px-4 py-3 rounded transition-colors flex items-center justify-between ${
                  selectedCurrency === currency.code
                    ? 'bg-green-100 text-green-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div>
                  <div className="font-semibold">{currency.name}</div>
                  <div className="text-sm">
                    {currency.symbol} {prices[currency.code]?.toLocaleString()}
                  </div>
                </div>
                {selectedCurrency === currency.code && (
                  <span className="text-lg">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t px-4 py-3 bg-gray-50">
            <p className="text-xs text-gray-600 font-medium">Current Price</p>
            <p className="text-lg font-bold text-gray-900">
              {currentCurrency?.symbol} {currentPrice?.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
