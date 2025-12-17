export type CartCurrency = 'INR' | 'USD' | 'NPR';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  currency: CartCurrency;
  workshop?: string;
  scheduleId?: string;
  seatsTotal?: number;
  mode?: string;
  language?: string;
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
