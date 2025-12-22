/**
 * Swar Yoga - Shared TypeScript Types
 * © 2025 Swar Yoga. All rights reserved.
 * 
 * Central location for application-wide type definitions
 * to ensure consistency and maintainability.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============ Authentication Types ============

export interface TokenPayload {
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  username?: string;
}

export interface AuthContext {
  ownerType: 'user' | 'admin';
  ownerId: string;
}

// ============ API Response Types ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

// ============ Budget Types ============

export interface BudgetAllocation {
  key: string;
  label: string;
  percent: number;
  kind: 'profit' | 'expense';
}

export interface BudgetPlanData {
  year: number;
  currency: string;
  incomeTargetYearly: number;
  incomeTargetMonthly: number;
  allocations: BudgetAllocation[];
}

export interface NormalizedAllocationsResult {
  allocations: BudgetAllocation[];
  error?: string;
}

// ============ Account Types ============

export type AccountType = 'bank' | 'cash' | 'investment' | 'loan';

export interface AccountData {
  userId: string;
  name: string;
  type: AccountType;
  accountNumber?: string;
  bankName?: string;
  balance: number;
  budgetAllocationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============ Transaction Types ============

export type TransactionType = 'income' | 'expense';

export interface TransactionData {
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  account_id: string;
  date: Date;
  createdAt?: Date;
}

// ============ Workshop Types ============

export type WorkshopMode = 'online' | 'offline';

export interface WorkshopScheduleData {
  workshopId: string;
  workshopSlug: string;
  date: string;
  mode: WorkshopMode;
  language: string;
  fees: number;
  currency: string;
  totalSeats: number;
  bookedSeats: number;
  published: boolean;
}

// ============ Payment Types ============

export type PaymentMethod = 'payu' | 'nepal_qr' | 'direct';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'pending_manual';
export type OrderStatus = 'confirmed' | 'cancelled' | 'completed';

export interface OrderData {
  userId?: string;
  workshopId: string;
  scheduleId: string;
  payuTxnId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  email: string;
  phone: string;
  name: string;
  seatInventoryAdjusted: boolean;
}

// ============ Rate Limiting Types ============

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number; // Timestamp when limit resets
}

// ============ Logging Types ============

export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  ip?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
}

export interface RequestLog {
  timestamp: string;
  context: RequestContext;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
}

// ============ User Types ============

export interface UserData {
  _id?: string;
  profileId?: number;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  state: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  profession: string;
  password?: string; // Should not be included in responses
  profileImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  id: string;
  profileId: number;
  name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  gender: string;
  age: number;
  profession: string;
  profileImage?: string;
}

// ============ Validation Types ============

export interface ValidationResult {
  valid: boolean;
  missing?: string[];
  errors?: Record<string, string>;
}

// ============ Generic Helper Types ============

export type AsyncFunction<T = void> = () => Promise<T>;
export type AsyncHandler<T = void> = (request: NextRequest) => Promise<NextResponse<T> | NextResponse>;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
