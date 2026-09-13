import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionType = 'dropdown' | 'text' | 'paragraph' | 'radio' | 'checkbox';

export interface IFormQuestion extends Document {
  fieldKey: string;
  formType: string;
  questionType: QuestionType;
  label: {
    en: string;
    hi?: string;
    mr?: string;
  };
  placeholder?: {
    en?: string;
    hi?: string;
    mr?: string;
  };
  options?: Array<{
    value: string;
    label: {
      en: string;
      hi?: string;
      mr?: string;
    };
  }>;
  required: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormQuestionSchema = new Schema<IFormQuestion>(
  {
    fieldKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    formType: {
      type: String,
      required: true,
      default: 'workshop',
      index: true,
    },
    questionType: {
      type: String,
      required: true,
      enum: ['dropdown', 'text', 'paragraph', 'radio', 'checkbox'],
      default: 'dropdown',
    },
    label: {
      en: { type: String, required: true },
      hi: { type: String, default: '' },
      mr: { type: String, default: '' },
    },
    placeholder: {
      en: { type: String, default: '' },
      hi: { type: String, default: '' },
      mr: { type: String, default: '' },
    },
    options: [
      {
        value: { type: String, required: true },
        label: {
          en: { type: String, required: true },
          hi: { type: String, default: '' },
          mr: { type: String, default: '' },
        },
      },
    ],
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation in development HMR
const FormQuestion: Model<IFormQuestion> =
  mongoose.models.FormQuestion || mongoose.model<IFormQuestion>('FormQuestion', FormQuestionSchema);

export default FormQuestion;
