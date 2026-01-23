/**
 * Admin Settings Schema
 * Stores company branding (logo, signature, letterhead)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminSettings extends Document {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  logoUrl?: string; // S3 URL
  signatureUrl?: string; // S3 URL
  adminName: string;
  adminTitle: string; // e.g., "Managing Director"
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  certificateNote?: string; // Custom note on certificate
  receiptNote?: string; // Custom note on receipt
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const AdminSettingsSchema = new Schema<IAdminSettings>(
  {
    companyName: { type: String, required: true, default: 'Swar Yoga' },
    companyAddress: { type: String, required: true },
    companyPhone: { type: String, required: true },
    companyEmail: { type: String, required: true },
    companyWebsite: { type: String },
    logoUrl: { type: String }, // S3 URL to logo image
    signatureUrl: { type: String }, // S3 URL to admin signature image
    adminName: { type: String, required: true },
    adminTitle: { type: String, default: 'Administrator' },
    bankName: { type: String },
    bankAccount: { type: String },
    bankIFSC: { type: String },
    certificateNote: {
      type: String,
      default: 'This certificate is issued as proof of investment in our company.',
    },
    receiptNote: {
      type: String,
      default: 'Thank you for your investment. This receipt is valid proof of payment.',
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const getAdminSettings = () => {
  return (
    mongoose.models.AdminSettings ||
    mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema)
  );
};

export const AdminSettings = mongoose.models.AdminSettings || mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema);
