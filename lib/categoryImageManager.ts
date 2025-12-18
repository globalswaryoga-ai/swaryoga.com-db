// Category Image Management - Save/Load category images from localStorage
import { VISION_CATEGORY_IMAGES } from '@/lib/visionCategoryImages';

const CATEGORY_IMAGES_STORAGE_KEY = 'swar_vision_category_images';

export const categoryImageManager = {
  // Get the image URL for a category (from custom storage or default)
  getCategoryImage: (category: string): string => {
    if (typeof window === 'undefined') return VISION_CATEGORY_IMAGES[category] || VISION_CATEGORY_IMAGES['Life'];
    
    const stored = localStorage.getItem(CATEGORY_IMAGES_STORAGE_KEY);
    if (stored) {
      try {
        const images = JSON.parse(stored);
        return images[category] || VISION_CATEGORY_IMAGES[category] || VISION_CATEGORY_IMAGES['Life'];
      } catch {
        return VISION_CATEGORY_IMAGES[category] || VISION_CATEGORY_IMAGES['Life'];
      }
    }
    return VISION_CATEGORY_IMAGES[category] || VISION_CATEGORY_IMAGES['Life'];
  },

  // Get all category images
  getAllCategoryImages: (): Record<string, string> => {
    if (typeof window === 'undefined') return VISION_CATEGORY_IMAGES as Record<string, string>;
    
    const stored = localStorage.getItem(CATEGORY_IMAGES_STORAGE_KEY);
    if (stored) {
      try {
        const images = JSON.parse(stored);
        return images;
      } catch {
        return VISION_CATEGORY_IMAGES as Record<string, string>;
      }
    }
    return VISION_CATEGORY_IMAGES as Record<string, string>;
  },

  // Update a category's image URL (persists to localStorage)
  updateCategoryImage: (category: string, imageUrl: string): void => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(CATEGORY_IMAGES_STORAGE_KEY);
    let images: Record<string, string>;
    
    if (stored) {
      try {
        images = JSON.parse(stored);
      } catch {
        images = { ...VISION_CATEGORY_IMAGES } as Record<string, string>;
      }
    } else {
      images = { ...VISION_CATEGORY_IMAGES } as Record<string, string>;
    }
    
    images[category] = imageUrl;
    localStorage.setItem(CATEGORY_IMAGES_STORAGE_KEY, JSON.stringify(images));
  },

  // Reset category image to default
  resetCategoryImage: (category: string): void => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(CATEGORY_IMAGES_STORAGE_KEY);
    if (stored) {
      try {
        const images = JSON.parse(stored);
        delete images[category];
        localStorage.setItem(CATEGORY_IMAGES_STORAGE_KEY, JSON.stringify(images));
      } catch {
        // ignore
      }
    }
  },

  // Initialize storage with default images
  initializeDefaultImages: (): void => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(CATEGORY_IMAGES_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(CATEGORY_IMAGES_STORAGE_KEY, JSON.stringify(VISION_CATEGORY_IMAGES));
    }
  }
};
