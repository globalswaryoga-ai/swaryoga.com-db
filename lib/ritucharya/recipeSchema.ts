import { Document, Schema, model, models } from 'mongoose';

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Recipe extends Document {
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  category: 'salad' | 'drink' | 'breakfast' | 'lunch' | 'dinner' | 'herbal' | 'dessert';
  categoryHi: string;
  primaryRasa: 'Sweet' | 'Sour' | 'Salty' | 'Pungent' | 'Bitter' | 'Astringent';
  primaryRasaHi: string;
  servings: number;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  instructionsHi: string[];
  nutritionTips: string[];
  nutritionTipsHi: string[];
  benefits: string[];
  benefitsHi: string[];

  // Media
  thumbnailUrl?: string; // Bunny CDN URL
  images: {
    url: string; // Bunny CDN URL
    caption?: string;
  }[];
  videoUrl?: string; // Bunny CDN video URL
  pdfUrl?: string; // Bunny CDN PDF URL

  // Dosha & Ritu
  doshaImpact: {
    vata: 'increase' | 'decrease' | 'balance';
    pitta: 'increase' | 'decrease' | 'balance';
    kapha: 'increase' | 'decrease' | 'balance';
  };
  bestForRitus: string[]; // Array of ritu IDs (grisham, varsha, etc.)

  // Meta
  createdBy: string; // admin user ID
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  viewCount?: number;
}

const recipeSchema = new Schema<Recipe>(
  {
    name: { type: String, required: true },
    nameHi: { type: String, required: true },
    description: { type: String },
    descriptionHi: { type: String },
    category: { type: String, required: true, enum: ['salad', 'drink', 'breakfast', 'lunch', 'dinner', 'herbal', 'dessert'] },
    categoryHi: { type: String },
    primaryRasa: { type: String, required: true },
    primaryRasaHi: { type: String },
    servings: { type: Number, default: 1 },
    prepTime: { type: Number, default: 0 },
    cookTime: { type: Number, default: 0 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },

    ingredients: [{
      name: String,
      quantity: String,
      unit: String,
    }],

    instructions: [String],
    instructionsHi: [String],
    nutritionTips: [String],
    nutritionTipsHi: [String],
    benefits: [String],
    benefitsHi: [String],

    thumbnailUrl: String,
    images: [{
      url: String,
      caption: String,
    }],
    videoUrl: String,
    pdfUrl: String,

    doshaImpact: {
      vata: String,
      pitta: String,
      kapha: String,
    },

    bestForRitus: [String],
    createdBy: String,
    isPublished: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Recipe = models.Recipe || model<Recipe>('Recipe', recipeSchema);

export interface RecipeFormData {
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  category: string;
  categoryHi: string;
  primaryRasa: string;
  primaryRasaHi: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  instructionsHi: string[];
  nutritionTips: string[];
  nutritionTipsHi: string[];
  benefits: string[];
  benefitsHi: string[];
  doshaImpact: {
    vata: string;
    pitta: string;
    kapha: string;
  };
  bestForRitus: string[];
  thumbnailUrl?: string;
  images: { url: string; caption?: string }[];
  videoUrl?: string;
  pdfUrl?: string;
  isPublished: boolean;
}
