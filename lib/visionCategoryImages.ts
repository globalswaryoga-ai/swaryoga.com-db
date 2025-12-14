// Vision Category Images - Mapping each category head to its default image URL
export const VISION_CATEGORY_IMAGES: Record<string, string> = {
  // NOTE: These must be direct image URLs (hotlinkable). Pinterest shortlinks often render as HTML
  // or block embedding and therefore fail to show as <img src="...">.
  'Life': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  'Health': 'https://images.unsplash.com/photo-1554284126-aa88f22d8b72?auto=format&fit=crop&w=1200&q=80',
  'Wealth': 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80',
  'Success': 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  'Respect': 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=80',
  'Pleasure': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  'Prosperity': 'https://images.unsplash.com/photo-1526304764001-ccf6d1c7c1a6?auto=format&fit=crop&w=1200&q=80',
  'Luxurious': 'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&w=1200&q=80',
  'Good Habits': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
  'Sadhana': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
} as const;

// Get default image for a category
export const getDefaultCategoryImage = (category: string): string => {
  return VISION_CATEGORY_IMAGES[category] || VISION_CATEGORY_IMAGES['Life'];
};

// Get all category images for bulk operations
export const getAllCategoryImages = () => {
  return VISION_CATEGORY_IMAGES;
};

// Update category image (returns new mapping)
export const updateCategoryImage = (category: string, imageUrl: string): Record<string, string> => {
  return {
    ...VISION_CATEGORY_IMAGES,
    [category]: imageUrl
  };
};
