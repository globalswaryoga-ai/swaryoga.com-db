/**
 * Ritucharya Dietary Recommendations Schema
 * Stores what to eat and what to avoid for each Ritu + Phase combination
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITasteRecommendation {
  name: string;
  percentage: number;
  emoji: string;
  description: string;
}

export interface IAvoidRecommendation {
  name: string;
  emoji: string;
  description: string;
}

export interface IRituDietaryRecommendation extends Document {
  ritu: 'shishir' | 'vasant' | 'grishma' | 'varsha' | 'sharad' | 'hemant';
  phase: 'begin' | 'peak' | 'last';
  title: string;
  tasteRecommendations: ITasteRecommendation[];
  avoidRecommendations: IAvoidRecommendation[];
  additionalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tasteRecommendationSchema = new Schema(
  {
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
    emoji: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const avoidRecommendationSchema = new Schema(
  {
    name: { type: String, required: true },
    emoji: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const rituDietaryRecommendationSchema = new Schema(
  {
    ritu: {
      type: String,
      enum: ['shishir', 'vasant', 'grishma', 'varsha', 'sharad', 'hemant'],
      required: true,
    },
    phase: {
      type: String,
      enum: ['begin', 'peak', 'last'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      example: 'Shishira Peak Dietary Recommendations',
    },
    tasteRecommendations: {
      type: [tasteRecommendationSchema],
      required: true,
      default: [
        {
          name: 'Mita',
          percentage: 60,
          emoji: '🍶',
          description: 'Mild / Balanced',
        },
        {
          name: 'Kasela',
          percentage: 40,
          emoji: '🍋',
          description: 'Astringent',
        },
        {
          name: 'Kadawa',
          percentage: 30,
          emoji: '☕',
          description: 'Bitter',
        },
      ],
    },
    avoidRecommendations: {
      type: [avoidRecommendationSchema],
      required: true,
      default: [
        { name: 'Salty', emoji: '🧂', description: 'Namkeen' },
        { name: 'Sour', emoji: '🍈', description: 'Amla' },
        { name: 'Spicy', emoji: '🌶️', description: 'Teekha' },
      ],
    },
    additionalNotes: {
      type: String,
      default: 'Follow these dietary recommendations based on your Ritu and phase for optimal health.',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure unique combination of ritu + phase
rituDietaryRecommendationSchema.index({ ritu: 1, phase: 1 }, { unique: true });

let RituDietaryRecommendation: mongoose.Model<IRituDietaryRecommendation>;

try {
  RituDietaryRecommendation = mongoose.model('RituDietaryRecommendation');
} catch (e) {
  RituDietaryRecommendation = mongoose.model(
    'RituDietaryRecommendation',
    rituDietaryRecommendationSchema
  );
}

export default RituDietaryRecommendation;
