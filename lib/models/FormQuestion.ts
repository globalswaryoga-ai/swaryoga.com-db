import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionType = 'dropdown' | 'text' | 'paragraph' | 'radio' | 'checkbox' | 'info' | 'payment';

export interface IPaymentConfig {
  gateway: 'razorpay' | 'custom';
  paymentUrl?: string;
  amount?: number;
  currency?: string;
  buttonLabel?: string;
  razorpayKeyId?: string;
  razorpayOrderId?: string;
  description?: string;
}

export interface IFormQuestion extends Document {
  fieldKey: string;
  formId: string;
  questionType: QuestionType;
  label: { en: string; hi?: string; mr?: string; };
  placeholder?: { en?: string; hi?: string; mr?: string; };
  options?: Array<{ value: string; label: { en: string; hi?: string; mr?: string; }; }>;
  imageUrl?: string;
  qrCodeUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  paymentConfig?: IPaymentConfig;
  required: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentConfigSchema = new Schema<IPaymentConfig>(
  {
    gateway: { type: String, enum: ['razorpay', 'custom'], default: 'custom' },
    paymentUrl: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    buttonLabel: { type: String, default: 'Pay Now' },
    razorpayKeyId: { type: String, default: '' },
    razorpayOrderId: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const FormQuestionSchema = new Schema<IFormQuestion>(
  {
    fieldKey: { type: String, required: true, trim: true, index: true },
    formId: { type: String, required: true, index: true },
    questionType: {
      type: String,
      required: true,
      enum: ['dropdown', 'text', 'paragraph', 'radio', 'checkbox', 'info', 'payment'],
      default: 'text',
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
    imageUrl: { type: String, default: '' },
    qrCodeUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    linkLabel: { type: String, default: '' },
    paymentConfig: { type: PaymentConfigSchema, default: null },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const FormQuestion: Model<IFormQuestion> =
  mongoose.models.FormQuestion || mongoose.model<IFormQuestion>('FormQuestion', FormQuestionSchema);

export default FormQuestion;
