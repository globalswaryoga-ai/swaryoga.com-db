import { useState, useEffect } from 'react';

export interface PurchaseHistory {
  name: string;
  id: string;
  purchaseDate: string;
}

/**
 * Hook to detect repeat purchases for a user
 * Fetches purchase history from backend and returns purchased items
 * 
 * Usage:
 * const { purchasedItems, isLoading, error } = usePurchaseHistory();
 * const isRepeatPurchase = purchasedItems.some(p => p.name === workshopName);
 */
export function usePurchaseHistory() {
  const [purchasedItems, setPurchasedItems] = useState<PurchaseHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        setIsLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        
        const response = await fetch('/api/user/purchase-history', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch purchase history');
        }

        const data = await response.json();
        
        if (data.isGuest) {
          console.log('👤 Guest user - no purchase history available');
          setIsGuest(true);
          setPurchasedItems([]);
        } else {
          console.log(`📊 Loaded ${data.purchasedItems?.length || 0} previous purchases for user ${data.userId}`);
          setPurchasedItems(data.purchasedItems || []);
        }
        
        setError(null);
      } catch (err) {
        console.error('⚠️ Error loading purchase history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPurchasedItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseHistory();
  }, []);

  /**
   * Check if a workshop/item has been purchased before
   * @param itemName - Name of the workshop/item
   * @returns true if this is a repeat purchase
   */
  const isRepeatPurchase = (itemName: string): boolean => {
    return purchasedItems.some(p => 
      p.name?.toLowerCase() === itemName?.toLowerCase()
    );
  };

  /**
   * Get all repeat purchase items from a list
   * @param items - Array of items to check
   * @returns Array of items that are repeat purchases
   */
  const getRepeatItems = (items: Array<{ name: string; id: string }>) => {
    return items.filter(item => isRepeatPurchase(item.name));
  };

  return {
    purchasedItems,
    isLoading,
    error,
    isGuest,
    isRepeatPurchase,
    getRepeatItems,
    purchaseCount: purchasedItems.length
  };
}
