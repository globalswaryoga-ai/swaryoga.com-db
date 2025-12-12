// Category Image URL Mapping from Environment Variables
// This file maps category selections to their corresponding image URLs

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'life': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_LIFE || 'https://pin.it/eF3JDEkmQ',
  'health': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_HEALTH || 'https://pin.it/6p2SwBJC9',
  'wealth': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_WEALTH || 'https://pin.it/24bCh7OCW',
  'success': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_SUCCESS || 'https://pin.it/78YBXZbiq',
  'respect': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_RESPECT || 'https://pin.it/NOlDja1DZ',
  'pleasure': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_PLEASURE || 'https://pin.it/6wRYgwPsk',
  'prosperity': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_PROSPERITY || 'https://pin.it/3zIFb255d',
  'luxuries': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_LUXURIES || 'https://pin.it/2m9p29gQC',
  'good-habits': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_GOOD_HABITS || 'https://pin.it/3W4GCO6xt',
  'self-sadhana': process.env.NEXT_PUBLIC_CATEGORY_IMAGE_SELF_SADHANA || 'https://pin.it/3w4WSwGpj'
};

/**
 * Get the image URL for a specific category
 * @param category - The category name (life, health, wealth, etc.)
 * @returns The image URL for the category, or default Life image if not found
 */
export const getCategoryImageUrl = (category: string): string => {
  return CATEGORY_IMAGE_MAP[category] || CATEGORY_IMAGE_MAP['life'];
};

/**
 * Get all category images
 * @returns Object with all category-image mappings
 */
export const getAllCategoryImages = (): Record<string, string> => {
  return { ...CATEGORY_IMAGE_MAP };
};

/**
 * Get category name from image URL
 * @param imageUrl - The image URL to search for
 * @returns The category name that corresponds to this image, or null if not found
 */
export const getCategoryFromImageUrl = (imageUrl: string): string | null => {
  for (const [category, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (url === imageUrl) {
      return category;
    }
  }
  return null;
};
