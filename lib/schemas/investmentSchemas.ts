/**
 * Investment System Database Schemas
 * Mongoose models for User, Investment, KYC, Payment, Company, OldInvestment
 */

import mongoose, { Schema, Document } from 'mongoose';
import { INVESTMENT_STATUS, ENTITIES, SHARE_TYPES, USER_ROLES } from '@/lib/investment-constants';

// ============ USER SCHEMA (Extended) ============
export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'admin' | 'cs' | 'ca';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhar?: string;
  pan?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
    },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    aadhar: { type: String },
    pan: { type: String },
  },
  { timestamps: true }
);

// ============ INVESTMENT SCHEMA ============
export interface IInvestment extends Document {
  userId?: mongoose.Types.ObjectId;
  name?: string; // For old investments or non-registered customers
  phone?: string; // For old investments or non-registered customers
  isOldInvestment?: boolean; // Old investments skip verification payment, just need KYC
  entity: 'swar-sakshi' | 'upamanyu';
  shareType?: 'equity' | 'preference' | null;
  amount: number;
  numberOfShares?: number;
  sharePrice?: number;
  interestRate?: number;
  dividendRate?: number;
  compound?: boolean;
  startDate: Date;
  endDate: Date;
  status: string;
  maturityAmount?: number;
  certificateUrl?: string;
  certificateNumber?: string;
  earlyRefundAllowed?: boolean; // For Swar Sakshi: false means cannot refund before due date
  refundRule?: string; // 'early_refund_blocked' or 'refund_at_maturity'
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    name: { type: String, trim: true }, // For old investments or non-registered customers
    phone: { type: String, trim: true }, // For old investments or non-registered customers
    isOldInvestment: { type: Boolean, default: false }, // Old investments skip verification payment
    entity: {
      type: String,
      enum: [ENTITIES.SWAR_SAKSHI, ENTITIES.UPAMANYU],
      required: true,
    },
    shareType: {
      type: String,
      enum: [SHARE_TYPES.EQUITY, SHARE_TYPES.PREFERENCE, null],
      default: null,
    },
    amount: { type: Number, required: true, min: 0 },
    numberOfShares: { type: Number, min: 0 },
    sharePrice: { type: Number, min: 0 },
    interestRate: { type: Number, min: 0, max: 100 },
    dividendRate: { type: Number, min: 0, max: 100 },
    compound: { type: Boolean, default: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(INVESTMENT_STATUS),
      default: INVESTMENT_STATUS.SUBMITTED,
    },
    maturityAmount: { type: Number },
    certificateUrl: { type: String },
    certificateNumber: { type: String, unique: true },
    earlyRefundAllowed: { type: Boolean, default: true }, // Default true for Upamanyu, set to false for Swar Sakshi
    refundRule: { type: String, default: 'refund_at_maturity' },
    notes: { type: String },
  },
  { timestamps: true }
);

// Add index for userId for faster queries
InvestmentSchema.index({ userId: 1 });
InvestmentSchema.index({ entity: 1 });
InvestmentSchema.index({ status: 1 });

// ============ KYC SCHEMA ============
export interface IKYC extends Document {
  investmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  aadharNumber: string;
  panNumber: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankIFSC?: string;
  documents: {
    aadharUrl?: string;
    panUrl?: string;
    bankUrl?: string;
  };
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
  rejectionReason?: string;
  uploadedAt: Date;
  approvedAt?: Date;
  updatedAt: Date;
}

const KYCSchema = new Schema<IKYC>(
  {
    investmentId: { type: Schema.Types.ObjectId, ref: 'Investment', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aadharNumber: { type: String, required: true },
    panNumber: { type: String, required: true },
    bankAccountNumber: { type: String },
    bankName: { type: String },
    bankIFSC: { type: String },
    documents: {
      aadharUrl: { type: String },
      panUrl: { type: String },
      bankUrl: { type: String },
    },
    status: {
      type: String,
      enum: ['pending', 'uploaded', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

KYCSchema.index({ investmentId: 1 });
KYCSchema.index({ userId: 1 });

// ============ PAYMENT SCHEMA ============
export interface IPayment extends Document {
  investmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  paymentType: 'verification' | 'final';
  amount: number;
  currency: string;
  transactionId: string;
  orderId?: string;
  status: 'pending' | 'success' | 'failed';
  paymentMethod?: string;
  errorMessage?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    investmentId: { type: Schema.Types.ObjectId, ref: 'Investment', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paymentType: {
      type: String,
      enum: ['verification', 'final'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    transactionId: { type: String, required: true },
    orderId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    paymentMethod: { type: String },
    errorMessage: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.index({ investmentId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ transactionId: 1 });

// ============ COMPANY SCHEMA ============
export interface ICompany extends Document {
  name: string;
  entity: 'swar-sakshi' | 'upamanyu';
  equityPrice?: number;
  preferencePrice?: number;
  equityFaceValue?: number;
  preferenceFaceValue?: number;
  companyValue?: number;
  totalEquityShares?: number;
  totalPreferenceShares?: number;
  year: number;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    entity: {
      type: String,
      enum: [ENTITIES.SWAR_SAKSHI, ENTITIES.UPAMANYU],
      required: true,
    },
    equityPrice: { type: Number },
    preferencePrice: { type: Number },
    equityFaceValue: { type: Number },
    preferenceFaceValue: { type: Number },
    companyValue: { type: Number },
    totalEquityShares: { type: Number },
    totalPreferenceShares: { type: Number },
    year: { type: Number, default: () => new Date().getFullYear() },
  },
  { timestamps: true }
);

CompanySchema.index({ entity: 1, year: -1 });

// ============ OLD INVESTMENT SCHEMA (For Data Import) ============
export interface IOldInvestment extends Document {
  name: string;
  phone: string;
  email?: string;
  entity: 'swar-sakshi' | 'upamanyu';
  shareType?: 'equity' | 'preference' | null;
  amount: number;
  numberOfShares?: number;
  startDate: Date;
  endDate: Date;
  interestRate?: number;
  compound?: boolean;
  calculatedReturns?: number;
  investmentAgreementUrl?: string;
  certificateUrl?: string;
  certificateNumber?: string;
  importedAt: Date;
  importedBy: mongoose.Types.ObjectId;
  notes?: string;
}

const OldInvestmentSchema = new Schema<IOldInvestment>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    entity: {
      type: String,
      enum: [ENTITIES.SWAR_SAKSHI, ENTITIES.UPAMANYU],
      required: true,
    },
    shareType: {
      type: String,
      enum: [SHARE_TYPES.EQUITY, SHARE_TYPES.PREFERENCE, null],
    },
    amount: { type: Number, required: true },
    numberOfShares: { type: Number },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    interestRate: { type: Number },
    compound: { type: Boolean, default: false },
    calculatedReturns: { type: Number },
    investmentAgreementUrl: { type: String },
    certificateUrl: { type: String },
    certificateNumber: { type: String, unique: true },
    importedAt: { type: Date, default: Date.now },
    importedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

OldInvestmentSchema.index({ phone: 1 });
OldInvestmentSchema.index({ entity: 1 });

// ============ EXPORT GETTERS (For Lazy Loading) ============
export const getUser = () => {
  return mongoose.models.InvestmentUser || mongoose.model<IUser>('InvestmentUser', UserSchema);
};

export const getInvestment = () => {
  return mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);
};

export const getKYC = () => {
  return mongoose.models.KYC || mongoose.model<IKYC>('KYC', KYCSchema);
};

export const getPayment = () => {
  return mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
};

export const getCompany = () => {
  return mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
};

export const getOldInvestment = () => {
  return (
    mongoose.models.OldInvestment || mongoose.model<IOldInvestment>('OldInvestment', OldInvestmentSchema)
  );
};

// ============ DIRECT MODEL EXPORTS ============
export const InvestmentUser = mongoose.models.InvestmentUser || mongoose.model<IUser>('InvestmentUser', UserSchema);
export const Investment = mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);
export const KYC = mongoose.models.KYC || mongoose.model<IKYC>('KYC', KYCSchema);
export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
export const OldInvestment = mongoose.models.OldInvestment || mongoose.model<IOldInvestment>('OldInvestment', OldInvestmentSchema);
