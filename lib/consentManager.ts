/**
 * CONSENT MANAGER UTILITY
 * Opt-in/Opt-out compliance and user consent tracking
 * File: /lib/consentManager.ts
 */

import { UserConsent, AuditLog } from './schemas/enterpriseSchemas';
import { connectDB } from './db';
import { AuditLogger } from './auditLogger';

export class ConsentManager {
  /**
   * Get consent status for phone number
   */
  static async getConsentStatus(phoneNumber: string): Promise<any> {
    await connectDB();
    
    const consent = await UserConsent.findOne({ phoneNumber }).lean() as any;
    
    if (!consent) {
      return {
        phoneNumber,
        consentStatus: 'pending',
        isBlocked: false,
      };
    }
    
    // Check if blocked (STOP received)
    const isBlocked = consent.blockedUntil && new Date() < new Date(consent.blockedUntil);
    
    return {
      ...consent,
      isBlocked,
    };
  }

  /**
   * Opt-in user
   */
  static async optIn(phoneNumber: string, leadId: string, method: string = 'manual'): Promise<void> {
    await connectDB();
    
    await UserConsent.findOneAndUpdate(
      { phoneNumber },
      {
        phoneNumber,
        leadId,
        consentStatus: 'opted-in',
        consentDate: new Date(),
        consentMethod: method,
        blockedUntil: null,
        updatedAt: new Date(),
      },
      { upsert: true }
    );
  }

  /**
   * Opt-out user
   */
  static async optOut(phoneNumber: string, reason: string = 'User requested'): Promise<void> {
    await connectDB();
    
    await UserConsent.findOneAndUpdate(
      { phoneNumber },
      {
        consentStatus: 'opted-out',
        optOutDate: new Date(),
        optOutReason: reason,
        blockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year block
      }
    );
  }

  /**
   * Handle STOP/UNSUBSCRIBE keyword
   */
  static async handleUnsubscribeKeyword(
    phoneNumber: string,
    keyword: 'STOP' | 'UNSUBSCRIBE' | 'OPTOUT'
  ): Promise<void> {
    await connectDB();
    
    const blockDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    await UserConsent.findOneAndUpdate(
      { phoneNumber },
      {
        consentStatus: 'opted-out',
        optOutKeyword: keyword,
        optOutDate: new Date(),
        blockedUntil: new Date(Date.now() + blockDuration),
      }
    );
  }

  /**
   * Check if number can receive messages
   */
  static async canSendMessage(phoneNumber: string): Promise<boolean> {
    const consent = await this.getConsentStatus(phoneNumber);
    
    if (consent.isBlocked) {
      return false;
    }
    
    if (consent.consentStatus === 'opted-out') {
      return false;
    }
    
    if (consent.consentStatus === 'pending') {
      // Default: can send to pending (initial engagement)
      return true;
    }
    
    return consent.consentStatus === 'opted-in';
  }

  /**
   * Re-consent user after block period
   */
  static async reConsent(phoneNumber: string): Promise<void> {
    await connectDB();
    
    await UserConsent.findOneAndUpdate(
      { phoneNumber },
      {
        consentStatus: 'pending',
        blockedUntil: null,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Get all opted-out users
   */
  static async getOptedOutUsers(limit: number = 1000): Promise<any[]> {
    await connectDB();
    
    return await UserConsent.find({
      consentStatus: 'opted-out',
    })
      .select('phoneNumber optOutDate optOutReason')
      .limit(limit)
      .lean();
  }

  /**
   * Get users blocked temporarily
   */
  static async getBlockedUsers(): Promise<any[]> {
    await connectDB();
    
    return await UserConsent.find({
      blockedUntil: { $gt: new Date() },
    })
      .select('phoneNumber blockedUntil')
      .lean();
  }

  /**
   * Validate consent compliance
   */
  static async validateCompliance(phoneNumber: string): Promise<{
    compliant: boolean;
    reason?: string;
  }> {
    try {
      const canSend = await this.canSendMessage(phoneNumber);
      
      return {
        compliant: canSend,
        reason: canSend ? undefined : 'User has opted out or is temporarily blocked',
      };
    } catch (error) {
      return {
        compliant: false,
        reason: 'Compliance check failed',
      };
    }
  }
}
