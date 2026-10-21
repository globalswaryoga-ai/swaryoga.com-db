'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CashfreePaymentButton from '@/components/CashfreePaymentButton';
import { CartItem, getStoredCart, updateCartItemQuantity, removeCartItem, persistCart } from '@/lib/cart';
import { BANK_ACCOUNT_DETAILS, getWhatsAppLink } from '@/lib/bankTransferConfig';

const WORKSHOP_FEES: Record<string, { minPrice: number; maxPrice: number; currency: string }> = {
  'swar-yoga-basic-program': { minPrice: 145, maxPrice: 145, currency: 'INR' },
  'swar-yoga-basic': { minPrice: 96, maxPrice: 96, currency: 'INR' },
  'master-swar-yoga': { minPrice: 1500, maxPrice: 1500, currency: 'INR' },
  'yogasana-sadhana': { minPrice: 5400, maxPrice: 5400, currency: 'INR' },
  'swar-yoga-level-1': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'hindi-swar-yoga-l-1': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'niwasi-marathi-swar-yoga': { minPrice: 3600, maxPrice: 3600, currency: 'INR' },
  'swar-yoga-level-3': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-4': { minPrice: 6000, maxPrice: 6000, currency: 'INR' },
  '96-days-weight-loss': { minPrice: 6600, maxPrice: 6600, currency: 'INR' },
  '42-days-meditation': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'amrut-aahar': { minPrice: 7200, maxPrice: 7200, currency: 'INR' },
  'bandhan-mukti': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'swar-yoga-level-2': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-businessman': { minPrice: 4200, maxPrice: 4200, currency: 'INR' },
  'personality-development': { minPrice: 3300, maxPrice: 5500, currency: 'INR' },
  'garbh-sanskar': { minPrice: 1000, maxPrice: 9000, currency: 'INR' },
  'teacher-training': { minPrice: 15000, maxPrice: 33000, currency: 'INR' },
  'annual-satsang': { minPrice: 500, maxPrice: 1000, currency: 'INR' },
  'nadi-parikshan': { minPrice: 500, maxPrice: 1000, currency: 'INR' },
  'family-wellness': { minPrice: 2000, maxPrice: 4000, currency: 'INR' },
  'advanced-breathing': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'life-transformation': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'astavakra': { minPrice: 21000, maxPrice: 21000, currency: 'INR' },
  'self-awareness': { minPrice: 35000, maxPrice: 35000, currency: 'INR' },
  'swy-children': { minPrice: 4200, maxPrice: 4200, currency: 'INR' },
  'corporate-swy': { minPrice: 15000, maxPrice: 15000, currency: 'INR' },
  'happy-marriage': { minPrice: 8400, maxPrice: 8400, currency: 'INR' },
  'gurukul-training': { minPrice: 51000, maxPrice: 51000, currency: 'INR' },
  'swy-teacher': { minPrice: 12500, maxPrice: 12500, currency: 'INR' },
  'gurukul-organiser-training': { minPrice: 25000, maxPrice: 25000, currency: 'INR' },
  'naturopathy': { minPrice: 11000, maxPrice: 11000, currency: 'INR' },
  'meditation': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'weight-loss': { minPrice: 3500, maxPrice: 3500, currency: 'INR' },
  'pre-pregnancy': { minPrice: 15000, maxPrice: 15000, currency: 'INR' },
  'complete-health': { minPrice: 21000, maxPrice: 21000, currency: 'INR' },
};

export type PaymentPlanType = 'full' | 'part' | 'monthly' | '3month';

export default function EnhancedCheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'bank'>('cashfree');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pricing selection: 'full' | 'part' | 'monthly' | '3month'
  const [pricingSelection, setPricingSelection] = useState<Record<string, PaymentPlanType>>({});
  // Custom editable deposit amounts for part payment
  const [customPartAmounts, setCustomPartAmounts] = useState<Record<string, number>>({});
  
  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  // Detect repeat purchases based on user's purchase history and sync live schedules
  useEffect(() => {
    const loadCartAndDetectRepeatPurchases = async () => {
      let items = getStoredCart();
      
      // Fetch latest schedule data from API to ensure price, time, batch, and payment settings are fresh
      try {
        const schedulesRes = await fetch(`/api/workshops/schedules?_t=${Date.now()}`, { cache: 'no-store' });
        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          const schedules = schedulesData.data || [];
          
          let changed = false;
          items = items.map(item => {
            const schedule = schedules.find((s: any) => 
              (item.scheduleId && s.id === item.scheduleId) ||
              (item.workshopSlug && s.workshopSlug === item.workshopSlug)
            );

            if (schedule) {
              const defaultFee = WORKSHOP_FEES[item.workshopSlug || '']?.minPrice || 0;
              const rawPrice = Number(schedule.price);
              const validPrice = Number.isFinite(rawPrice) && rawPrice > 0 
                ? rawPrice 
                : (defaultFee > 0 ? defaultFee : item.price);
              
              const updatedPrice = validPrice > 0 ? validPrice : item.price;
              const allowPartPayment = schedule.allowPartPayment ?? schedule.metadata?.allowPartPayment ?? true;
              const partPaymentMinAmount = Number(schedule.partPaymentMinAmount ?? schedule.metadata?.partPaymentMinAmount ?? 2000);
              const pricingType = schedule.pricingType || schedule.metadata?.pricingType || 'one-time';

              changed = true;
              return {
                ...item,
                price: updatedPrice,
                metadata: {
                  ...item.metadata,
                  time: schedule.time || (schedule.batch === 'full-day' ? 'Full Day' : item.metadata?.time),
                  startDate: schedule.startDate || item.metadata?.startDate,
                  price3Month: schedule.price3Month || item.metadata?.price3Month,
                  pricingType,
                  allowPartPayment,
                  partPaymentMinAmount,
                },
              };
            }
            return item;
          });

          if (changed) {
            persistCart(items);
          }
        }
      } catch (error) {
        console.error('Failed to sync schedule prices with checkout:', error);
      }

      // Initialize default payment plans and default deposit amounts
      const initialPricing: Record<string, PaymentPlanType> = {};
      const initialPartAmounts: Record<string, number> = {};

      items.forEach(item => {
        const selected = (item.metadata?.selectedPricing as string | undefined);
        if (selected === 'part' || selected === '3month' || selected === 'monthly' || selected === 'full') {
          initialPricing[item.id] = selected as PaymentPlanType;
        } else {
          const pt = String(item.metadata?.pricingType || '').toLowerCase();
          if (pt === 'monthly') initialPricing[item.id] = 'monthly';
          else if (pt === '3month') initialPricing[item.id] = '3month';
          else initialPricing[item.id] = 'full';
        }

        const minDeposit = Number(item.metadata?.partPaymentMinAmount || 2000);
        initialPartAmounts[item.id] = Math.min(item.price, minDeposit > 0 ? minDeposit : 2000);
      });

      setPricingSelection(initialPricing);
      setCustomPartAmounts(initialPartAmounts);
      
      try {
        // Try to fetch user's purchase history
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/user/purchase-history', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });

        if (response.ok) {
          const { purchasedItems, userId } = await response.json();
          console.log(`🔍 User ${userId || 'guest'} - Checking ${items.length} items against ${purchasedItems?.length || 0} previous purchases`);
          
          // Mark items as repeat purchase if they exist in purchase history
          const updatedItems = items.map(item => {
            const isPurchased = purchasedItems?.some((p: any) => 
              p.name?.toLowerCase() === item.name?.toLowerCase() || 
              p.id === item.id
            );
            
            if (isPurchased) {
              console.log(`✅ ${item.name} - REPEAT PURCHASE (40% discount applied)`);
              return { ...item, isRepeatPurchase: true };
            } else {
              console.log(`⭕ ${item.name} - First time purchase (full price)`);
              return { ...item, isRepeatPurchase: false };
            }
          });
          
          setCartItems(updatedItems);
        } else {
          // Guest user or no auth - don't apply repeat purchase discount
          console.log('👤 Guest user detected - no repeat purchase discount');
          setCartItems(items.map(item => ({ ...item, isRepeatPurchase: false })));
        }
      } catch (error) {
        console.error('⚠️ Error detecting repeat purchases:', error);
        // Fallback: load cart without repeat purchase detection
        setCartItems(items.map(item => ({ ...item, isRepeatPurchase: false })));
      } finally {
        setIsLoaded(true);
      }
    };

    loadCartAndDetectRepeatPurchases();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Get item price based on pricing selection (full, part, monthly, or 3-month)
  const getItemPrice = (item: CartItem) => {
    const selection = pricingSelection[item.id] || (
      item.metadata?.selectedPricing === 'part' ? 'part' :
      item.metadata?.pricingType === 'monthly' ? 'monthly' :
      item.metadata?.pricingType === '3month' ? '3month' : 'full'
    );
    const storedPrice3Month = item.metadata?.price3Month as number | undefined;

    if (selection === 'part') {
      const minDeposit = Number(item.metadata?.partPaymentMinAmount || 2000);
      const custom = customPartAmounts[item.id];
      if (typeof custom === 'number' && Number.isFinite(custom) && custom > 0) {
        return custom;
      }
      return Math.min(item.price, minDeposit > 0 ? minDeposit : 2000);
    }
    
    if (selection === '3month') {
      if (storedPrice3Month && storedPrice3Month > 0) {
        return storedPrice3Month;
      }
      return Math.round(item.price * 3 * 0.85);
    }

    if (selection === 'monthly') {
      return item.price;
    }

    return item.price;
  };

  // Calculate subtotal with pricing selection and repeat purchase discount
  const subtotal = cartItems.reduce((sum, item) => {
    let itemPrice = getItemPrice(item);
    
    // Apply 40% discount for repeat purchases
    if (item.isRepeatPurchase) {
      itemPrice = itemPrice * 0.6; // 40% discount = 60% of original price
    }
    
    return sum + itemPrice * item.quantity;
  }, 0);
  
  // Apply promo discount
  const subtotalAfterPromo = promoApplied ? subtotal * (1 - promoDiscount / 100) : subtotal;
  const tax = parseFloat((subtotalAfterPromo * 0.025).toFixed(2)); // 2.5% Service Charges
  const total = parseFloat((subtotalAfterPromo + tax).toFixed(2));

  // Handle promo code application
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }
    
    setPromoError('');
    
    // Simple promo codes - can be extended to fetch from API
    const promoCodes: Record<string, number> = {
      'SWAR10': 10,
      'YOGA20': 20,
      'WELCOME15': 15,
      'NAMASTE25': 25,
    };
    
    const discount = promoCodes[promoCode.toUpperCase()];
    if (discount) {
      setPromoDiscount(discount);
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid promo code');
      setPromoDiscount(0);
      setPromoApplied(false);
    }
  };

  // Handle pricing selection change
  const handlePricingChange = (itemId: string, selection: PaymentPlanType) => {
    setPricingSelection(prev => ({ ...prev, [itemId]: selection }));
  };

  // Handle custom deposit change
  const handleCustomPartChange = (itemId: string, amount: number) => {
    setCustomPartAmounts(prev => ({ ...prev, [itemId]: amount }));
  };

  const isFormValid = 
    formData.firstName &&
    formData.email &&
    formData.phone &&
    formData.city &&
    acceptedTerms &&
    cartItems.length > 0;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yoga-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-yoga-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yoga-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Cart Empty</h1>
            <p className="text-gray-600 mb-8">Add items to your cart before checking out</p>
            <Link
              href="/courses"
              className="inline-block bg-gradient-to-r from-yoga-600 to-yoga-700 text-white font-bold py-3 px-8 rounded-lg hover:shadow-lg transition-all"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yoga-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <Link href="/cart" className="text-yoga-600 hover:text-yoga-700 flex items-center gap-2 mb-4">
              <span>←</span> Back to Cart
            </Link>
            <h1 className="text-4xl font-bold text-gray-900">💳 Secure Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your purchase with Cashfree's secure payment gateway</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {['Cart', 'Information', 'Payment', 'Confirmation'].map((step, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    index < 2 ? 'bg-green-500' : index === 2 ? 'bg-yoga-600' : 'bg-gray-300'
                  }`}>
                    {index < 2 ? '✓' : index + 1}
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${
                    index < 3 ? (index < 2 ? 'bg-green-500' : 'bg-yoga-300') : 'bg-gray-300'
                  }`}></div>
                  <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Sadhak Information */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📍 Sadhak Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name *"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address *"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors md:col-span-2"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors md:col-span-2"
                    required
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder="Address (Optional)"
                    value={formData.address}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors md:col-span-2"
                  />
                  <input
                    type="text"
                    name="city"
                    placeholder="City *"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State (Optional)"
                    value={formData.state}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    name="zip"
                    placeholder="ZIP Code (Optional)"
                    value={formData.zip}
                    onChange={handleFormChange}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Editable Cart Items */}
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 Your Items</h2>
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    // Calculate 3-month price: use stored value or default to 15% discount
                    const storedPrice3Month = item.metadata?.price3Month as number | undefined;
                    const defaultPrice3Month = Math.round(item.price * 3 * 0.85); // 15% discount for 3 months
                    const price3Month = (storedPrice3Month && storedPrice3Month > 0) ? storedPrice3Month : defaultPrice3Month;
                    
                    // Show pricing selector for all workshop items
                    const isWorkshopItem = !!item.workshopSlug || !!item.scheduleId;
                    const selectedPricing: PaymentPlanType = pricingSelection[item.id] || (
                      item.metadata?.selectedPricing === 'part' ? 'part' :
                      item.metadata?.pricingType === 'monthly' ? 'monthly' :
                      item.metadata?.pricingType === '3month' ? '3month' : 'full'
                    );
                    const currentPrice = getItemPrice(item);
                    const minDeposit = Number(item.metadata?.partPaymentMinAmount || 2000);
                    const currentPartAmount = typeof customPartAmounts[item.id] === 'number' && Number.isFinite(customPartAmounts[item.id]) && customPartAmounts[item.id] > 0
                      ? customPartAmounts[item.id]
                      : Math.min(item.price, minDeposit > 0 ? minDeposit : 2000);
                    const remainingBalance = Math.max(0, item.price - currentPartAmount);
                    
                    return (
                      <div key={item.id} className="p-4 border-2 border-gray-200 rounded-xl hover:border-yoga-400 transition-colors bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 text-base">{item.name}</p>
                              {item.isRepeatPurchase && (
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                                  40% OFF
                                </span>
                              )}
                            </div>
                            {(item.metadata?.startDate as string | undefined) && (
                              <p className="text-xs text-gray-600 mt-1">
                                📅 Starts: {new Date(String(item.metadata!.startDate)).toLocaleDateString('en-IN')}
                                {(item.metadata?.time as string | undefined) && ` • ⏰ ${String(item.metadata!.time)}`}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center border-2 border-gray-300 rounded-lg">
                              <button
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    updateCartItemQuantity(item.id, item.quantity - 1);
                                    setCartItems(getStoredCart());
                                  }
                                }}
                                className="px-3 py-1 text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                −
                              </button>
                              <span className="px-4 py-1 font-semibold text-gray-900">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  updateCartItemQuantity(item.id, item.quantity + 1);
                                  setCartItems(getStoredCart());
                                }}
                                className="px-3 py-1 text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                +
                              </button>
                            </div>

                            {/* Subtotal */}
                            <span className="font-extrabold text-yoga-700 w-32 text-right text-base">
                              {item.currency || 'INR'} {(
                                (item.isRepeatPurchase ? currentPrice * 0.6 : currentPrice) * item.quantity
                              ).toLocaleString('en-IN')}
                            </span>

                            {/* Remove Button */}
                            <button
                              onClick={() => {
                                removeCartItem(item.id);
                                setCartItems(getStoredCart());
                              }}
                              className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        
                        {/* 4 Payment Plan Options: Full Payment, Partly, Monthly, 3 Month */}
                        {isWorkshopItem && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-bold text-gray-800">Select Payment Plan:</p>
                              <span className="text-[11px] text-gray-500 font-medium">Default auto-selected • Click to change</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {/* 1. Full Payment Option */}
                              <label 
                                className={`flex flex-col justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                                  selectedPricing === 'full' 
                                    ? 'border-yoga-600 bg-yoga-50/70 shadow-sm ring-1 ring-yoga-500' 
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="radio"
                                    name={`pricing-${item.id}`}
                                    checked={selectedPricing === 'full'}
                                    onChange={() => handlePricingChange(item.id, 'full')}
                                    className="w-4 h-4 mt-0.5 text-yoga-600 focus:ring-yoga-500"
                                  />
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">Full Payment</p>
                                    <p className="text-base font-extrabold text-yoga-700 mt-0.5">₹{item.price.toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-2 font-medium">One-time complete program fee</p>
                              </label>

                              {/* 2. Part Payment (Deposit) Option */}
                              <label 
                                className={`flex flex-col justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                                  selectedPricing === 'part' 
                                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500' 
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="radio"
                                    name={`pricing-${item.id}`}
                                    checked={selectedPricing === 'part'}
                                    onChange={() => handlePricingChange(item.id, 'part')}
                                    className="w-4 h-4 mt-0.5 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-bold text-emerald-950 text-sm">Partly (Deposit)</p>
                                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded">Book Seat</span>
                                    </div>
                                    <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                                      ₹{currentPartAmount.toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                </div>

                                {selectedPricing === 'part' ? (
                                  <div className="mt-2.5 pt-2 border-t border-emerald-200" onClick={(e) => e.stopPropagation()}>
                                    <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                                      Editable Deposit Amount:
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-emerald-800">₹</span>
                                      <input
                                        type="number"
                                        min={minDeposit}
                                        max={item.price}
                                        value={currentPartAmount}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          handleCustomPartChange(item.id, val);
                                        }}
                                        className="w-full px-2 py-1 text-xs font-bold border-2 border-emerald-400 rounded-md bg-white text-emerald-950 focus:outline-none focus:border-emerald-600 shadow-inner"
                                        title="Enter your desired advance deposit amount"
                                      />
                                    </div>
                                    <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                                      Bal. ₹{remainingBalance.toLocaleString('en-IN')} payable later
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-emerald-700 mt-2 font-medium">
                                    Min ₹{minDeposit.toLocaleString('en-IN')} advance
                                  </p>
                                )}
                              </label>

                              {/* 3. Monthly Option */}
                              <label 
                                className={`flex flex-col justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                                  selectedPricing === 'monthly' 
                                    ? 'border-yoga-600 bg-yoga-50/70 shadow-sm ring-1 ring-yoga-500' 
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="radio"
                                    name={`pricing-${item.id}`}
                                    checked={selectedPricing === 'monthly'}
                                    onChange={() => handlePricingChange(item.id, 'monthly')}
                                    className="w-4 h-4 mt-0.5 text-yoga-600 focus:ring-yoga-500"
                                  />
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">Monthly Plan</p>
                                    <p className="text-base font-extrabold text-yoga-700 mt-0.5">₹{item.price.toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-2 font-medium">1 Month recurring access</p>
                              </label>

                              {/* 4. 3 Months Option */}
                              <label 
                                className={`flex flex-col justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                                  selectedPricing === '3month' 
                                    ? 'border-yoga-600 bg-yoga-50/70 shadow-sm ring-1 ring-yoga-500' 
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="radio"
                                    name={`pricing-${item.id}`}
                                    checked={selectedPricing === '3month'}
                                    onChange={() => handlePricingChange(item.id, '3month')}
                                    className="w-4 h-4 mt-0.5 text-yoga-600 focus:ring-yoga-500"
                                  />
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">3 Months</p>
                                    <p className="text-base font-extrabold text-yoga-700 mt-0.5">₹{price3Month.toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-emerald-700 mt-2 font-semibold">
                                  Save ₹{Math.max(0, (item.price * 3) - price3Month).toLocaleString('en-IN')}!
                                </p>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Promo Code */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🎁 Promo Code</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={promoApplied}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                      promoApplied 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 focus:border-yoga-600'
                    }`}
                  />
                  {promoApplied ? (
                    <button
                      onClick={() => {
                        setPromoCode('');
                        setPromoDiscount(0);
                        setPromoApplied(false);
                        setPromoError('');
                      }}
                      className="px-6 py-3 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyPromo}
                      className="px-6 py-3 bg-yoga-600 text-white font-bold rounded-lg hover:bg-yoga-700 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {promoError && (
                  <p className="text-red-600 text-sm mt-2">❌ {promoError}</p>
                )}
                {promoApplied && (
                  <p className="text-green-600 text-sm mt-2 font-semibold">✅ Promo code applied! {promoDiscount}% off</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Payment Method</h2>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-4 p-4 border-2 border-yoga-200 rounded-lg cursor-pointer hover:bg-yoga-50 transition-colors" 
                    onClick={() => setPaymentMethod('cashfree')}>
                    <input
                      type="radio"
                      name="payment"
                      value="cashfree"
                      checked={paymentMethod === 'cashfree'}
                      onChange={() => setPaymentMethod('cashfree')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-bold text-gray-900">🔒 Cashfree Payment Gateway</p>
                      <p className="text-sm text-gray-600">UPI, Cards, Wallets & More</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setPaymentMethod('bank')}>
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={() => setPaymentMethod('bank')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-bold text-gray-900">🏦 Bank Transfer</p>
                      <p className="text-sm text-gray-600">Direct bank transfer to our account</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 Order Items</h2>
                
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const price = getItemPrice(item);
                    const plan = pricingSelection[item.id] || (
                      item.metadata?.selectedPricing === 'part' ? 'part' :
                      item.metadata?.pricingType === 'monthly' ? 'monthly' :
                      item.metadata?.pricingType === '3month' ? '3month' : 'full'
                    );
                    return (
                      <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Qty: {item.quantity} • Plan: <span className="font-bold text-yoga-700 capitalize">{plan === 'part' ? 'Part Payment (Deposit)' : plan === '3month' ? '3 Months' : plan === 'monthly' ? 'Monthly' : 'Full Payment'}</span>
                          </p>
                        </div>
                        <p className="font-bold text-yoga-700">
                          {item.currency || 'INR'} {(price * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 mt-1"
                  />
                  <div>
                    <p className="text-gray-900 font-semibold">I agree to the Terms & Conditions</p>
                    <p className="text-gray-600 text-sm mt-1">
                      By proceeding, you agree to our privacy policy and terms of service. 
                      You will receive a confirmation email with access details.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">💎 Order Summary</h2>

                {/* Items Count */}
                <div className="mb-6 pb-6 border-b">
                  <p className="text-gray-700">
                    <span className="font-semibold">{cartItems.length}</span> item(s)
                  </p>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-4 mb-6 pb-6 border-b">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {/* Show promo discount if applied */}
                  {promoApplied && promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>🎁 Promo Discount ({promoDiscount}%)</span>
                      <span>-₹{(subtotal * promoDiscount / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-gray-700">
                    <span>Service Charges (2.5%)</span>
                    <span className="font-semibold">₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  
                  {/* Show repeat purchase discount if applicable */}
                  {cartItems.some(item => item.isRepeatPurchase) && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>🎉 Repeat Purchase Discount (40%)</span>
                      <span>-₹{(
                        cartItems
                          .filter(item => item.isRepeatPurchase)
                          .reduce((sum, item) => sum + (getItemPrice(item) * 0.4 * item.quantity), 0)
                      ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="mb-8 pb-8 border-b-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Total Amount</span>
                    <span className="text-3xl font-bold text-yoga-600">
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Payment Button */}
                {paymentMethod === 'cashfree' && (
                  <>
                    {isFormValid ? (
                      <CashfreePaymentButton
                        amount={Math.round(total)}
                        productInfo={`Swar Yoga - ${cartItems.length} Course(s)`}
                        firstName={formData.firstName}
                        lastName={formData.lastName}
                        email={formData.email}
                        phone={formData.phone}
                        city={formData.city}
                        address={formData.address}
                        state={formData.state}
                        zip={formData.zip}
                        token={localStorage.getItem('authToken') || ''}
                        onSuccess={() => {
                          router.push('/payment-success');
                        }}
                        onError={(error) => {
                          console.error('Payment error:', error);
                        }}
                        className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white font-bold py-4 px-4 rounded-lg transition-all transform hover:scale-105"
                      />
                    ) : (
                      <button
                        disabled
                        className="w-full bg-gray-400 text-white font-bold py-4 px-4 rounded-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span>⚠️</span> Fill Required Fields
                      </button>
                    )}
                  </>
                )}

                {/* Bank Transfer Details */}
                {paymentMethod === 'bank' && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-blue-900 mb-4">🏦 Bank Account Details</h3>
                    
                    <div className="space-y-3 text-sm">
                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">Beneficiary Name</p>
                        <p className="text-gray-900 font-bold">{BANK_ACCOUNT_DETAILS.beneficiaryName}</p>
                      </div>

                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">Bank & Branch</p>
                        <p className="text-gray-900 font-bold">{BANK_ACCOUNT_DETAILS.bank} – {BANK_ACCOUNT_DETAILS.branch}</p>
                      </div>

                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">IFSC Code</p>
                        <p className="text-gray-900 font-bold font-mono">{BANK_ACCOUNT_DETAILS.ifscCode}</p>
                      </div>

                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">SWIFT/BIC Code</p>
                        <p className="text-gray-900 font-bold font-mono">{BANK_ACCOUNT_DETAILS.swiftCode}</p>
                      </div>

                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">Bank Address</p>
                        <p className="text-gray-900 font-bold text-xs">{BANK_ACCOUNT_DETAILS.address}</p>
                      </div>

                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">Amount to Transfer</p>
                        <p className="text-gray-900 font-bold text-lg">₹{total.toLocaleString('en-IN')}</p>
                      </div>

                      <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="text-gray-600 font-semibold">Purpose</p>
                        <p className="text-gray-900 font-bold">{BANK_ACCOUNT_DETAILS.purpose}</p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="font-bold text-orange-900 mb-2">📸 After Transfer:</h4>
                      <p className="text-sm text-orange-800 mb-3">
                        Once you have completed the bank transfer, please send a screenshot of the transaction to WhatsApp along with your order details.
                      </p>
                      <a
                        href={getWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        <span>💬</span> Send WhatsApp Confirmation
                      </a>
                    </div>
                  </div>
                )}

                {paymentMethod === 'bank' && isFormValid && (
                  <button
                    onClick={() => {
                      setIsProcessing(true);
                      // Mark order as pending payment
                      setTimeout(() => {
                        router.push('/payment-pending');
                      }, 1000);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-4 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-60"
                  >
                    {isProcessing ? '⏳ Processing...' : '✓ I Have Made the Transfer'}
                  </button>
                )}

                {!isFormValid && paymentMethod === 'cashfree' && (
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white font-bold py-4 px-4 rounded-lg cursor-not-allowed opacity-60"
                  >
                    {!acceptedTerms ? '⚠️ Accept Terms to Continue' : '⚠️ Fill Required Fields'}
                  </button>
                )}

                {!isFormValid && paymentMethod === 'bank' && (
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white font-bold py-4 px-4 rounded-lg cursor-not-allowed opacity-60"
                  >
                    {!acceptedTerms ? '⚠️ Accept Terms to Continue' : '⚠️ Fill Required Fields'}
                  </button>
                )}

                {/* Security Badges */}
                <div className="mt-8 pt-8 border-t space-y-3">
                  <p className="text-sm text-gray-700 flex gap-2">
                    <span>🔐</span> <span>256-bit SSL Encrypted</span>
                  </p>
                  <p className="text-sm text-gray-700 flex gap-2">
                    <span>✅</span> <span>PCI DSS Compliant</span>
                  </p>
                  <p className="text-sm text-gray-700 flex gap-2">
                    <span>🛡️</span> <span>Fraud Protection</span>
                  </p>
                  <p className="text-sm text-gray-700 flex gap-2">
                    <span>⚡</span> <span>Instant Delivery</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
