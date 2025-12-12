// Vision Category Images - Mapping each category head to its default image URL
export const VISION_CATEGORY_IMAGES: Record<string, string> = {
  'Life': 'https://pin.it/eF3JDEkmQ',
  'Health': 'https://pin.it/6p2SwBJC9',
  'Wealth': 'https://pin.it/24bCh7OCW',
  'Success': 'https://pin.it/78YBXZbiq',
  'Respect': 'https://pin.it/NOlDja1DZ',
  'Pleasure': 'https://pin.it/6wRYgwPsk',
  'Prosperity': 'https://pin.it/3zIFb255d',
  'Luxurious': 'https://pin.it/2m9p29gQC',
  'Good Habits': 'https://pin.it/3W4GCO6xt',
  'Sadhana': 'https://pin.it/3w4WSwGpj'
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
