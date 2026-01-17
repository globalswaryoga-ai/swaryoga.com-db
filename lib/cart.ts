export type CartCurrency = 'INR' | 'USD' | 'NPR';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  currency?: CartCurrency;
  /**
   * Backward-compat: older cart items stored some fields under a `metadata` object.
   * Prefer the top-level fields (registeredName, level, instructor, etc.) going forward.
   */
  metadata?: {
    registeredName?: string;
    level?: string;
    instructor?: string;
    [key: string]: unknown;
  };
  kind?: 'workshop' | 'course' | 'other';
  productId?: string;
  workshop?: string;
  scheduleId?: string;
  seatsTotal?: number;
  mode?: string;
  language?: string;
  instructor?: string;
  level?: string;
  registeredName?: string;
  registeredEmail?: string;
  registeredPhone?: string;
  registeredCity?: string;
  registeredAt?: string;
  workshopSlug?: string;
  image?: string;
  description?: string;
  duration?: string;
  isRepeatPurchase?: boolean; // Flag for 40% discount on repeat purchases
}

const CART_STORAGE_KEY = 'swarYogaCart';

export const getStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as CartItem[];
  } catch (error) {
    console.error('Failed to parse stored cart', error);
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
};

export const persistCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
};

export const addCartItem = (item: CartItem) => {
  const current = getStoredCart();
  const existingIndex = current.findIndex((cartItem) => cartItem.id === item.id && cartItem.currency === item.currency);

  if (existingIndex !== -1) {
    current[existingIndex].quantity += item.quantity;
  } else {
    current.push(item);
  }

  persistCart(current);
};

export const clearCart = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_STORAGE_KEY);
};

export const updateCartItemQuantity = (itemId: string, quantity: number) => {
  const current = getStoredCart();
  const itemIndex = current.findIndex((item) => item.id === itemId);
  
  if (itemIndex !== -1) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      current.splice(itemIndex, 1);
    } else {
      current[itemIndex].quantity = quantity;
    }
    persistCart(current);
  }
};

export const removeCartItem = (itemId: string) => {
  const current = getStoredCart();
  const filtered = current.filter((item) => item.id !== itemId);
  persistCart(filtered);
};

export const updateCartItem = (itemId: string, updates: Partial<CartItem>) => {
  const current = getStoredCart();
  const itemIndex = current.findIndex((item) => item.id === itemId);
  
  if (itemIndex !== -1) {
    current[itemIndex] = { ...current[itemIndex], ...updates };
    persistCart(current);
  }
};
