import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFormDraft extends Document {
  title: string;
  description?: string;
  sections?: Array<{ title: string; order: number }>; // optional sections
  questions: any[]; // store raw question objects matching FormQuestion schema
  theme?: {
    darkMode: boolean;
    primaryColor: string;
  };
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const FormDraftSchema = new Schema<IFormDraft>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sections: [
      {
        title: { type: String, required: true },
        order: { type: Number, default: 0 },
      }
    ],
    questions: { type: Array, default: [] },
    theme: {
      darkMode: { type: Boolean, default: false },
      primaryColor: { type: String, default: '#0d6efd' }, // default bootstrap primary
    },
    ownerUserId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

const FormDraft: Model<IFormDraft> =
  mongoose.models.FormDraft || mongoose.model<IFormDraft>('FormDraft', FormDraftSchema);

export default FormDraft;
