/**
 * QR WhatsApp Contacts Sync Service
 * Syncs WhatsApp contacts with Google Contacts
 */

import { Db } from 'mongodb';

interface GoogleContact {
  id: string;
  displayName: string;
  emailAddresses?: Array<{ value: string }>;
  phoneNumbers?: Array<{ value: string }>;
}

export class QRContactsSyncService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Fetch contacts from Google Contacts API
   */
  async fetchGoogleContacts(accessToken: string) {
    try {
      const response = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();
      return data.connections || [];
    } catch (error) {
      console.error('[Contacts Sync] Fetch Google contacts error:', error);
      throw error;
    }
  }

  /**
   * Sync Google Contacts with WhatsApp contacts
   */
  async syncContactsToWhatsApp(userId: string, googleContacts: GoogleContact[]) {
    try {
      const syncedContacts = [];

      for (const contact of googleContacts) {
        const phone = contact.phoneNumbers?.[0]?.value || '';
        const email = contact.emailAddresses?.[0]?.value || '';

        if (!phone && !email) continue;

        const normalizedPhone = phone.replace(/\D/g, '');

        const contactRecord = {
          userId,
          googleContactId: contact.id,
          name: contact.displayName || 'Unknown',
          phone: normalizedPhone,
          email,
          syncedAt: new Date(),
          source: 'google_contacts',
        };

        // Upsert to avoid duplicates
        await this.db.collection('qr_contacts').updateOne(
          { userId, googleContactId: contact.id },
          { $set: contactRecord },
          { upsert: true }
        );

        syncedContacts.push(contactRecord);
      }

      // Log sync
      await this.db.collection('qr_contact_sync_logs').insertOne({
        userId,
        action: 'sync_from_google',
        status: 'completed',
        contactsCount: syncedContacts.length,
        createdAt: new Date(),
      });

      return syncedContacts;
    } catch (error) {
      console.error('[Contacts Sync] Sync error:', error);
      throw error;
    }
  }

  /**
   * Get synced contacts for a user
   */
  async getSyncedContacts(userId: string) {
    try {
      const contacts = await this.db
        .collection('qr_contacts')
        .find({ userId, source: 'google_contacts' })
        .toArray();

      return contacts;
    } catch (error) {
      console.error('[Contacts Sync] Get contacts error:', error);
      return [];
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId: string) {
    try {
      const lastSync = await this.db
        .collection('qr_contact_sync_logs')
        .findOne({ userId, action: 'sync_from_google' }, { sort: { createdAt: -1 } });

      const contactsCount = await this.db
        .collection('qr_contacts')
        .countDocuments({ userId, source: 'google_contacts' });

      return {
        lastSyncAt: lastSync?.createdAt || null,
        lastSyncStatus: lastSync?.status || 'never',
        syncedContactsCount: contactsCount,
      };
    } catch (error) {
      console.error('[Contacts Sync] Status error:', error);
      return {
        lastSyncAt: null,
        lastSyncStatus: 'error',
        syncedContactsCount: 0,
      };
    }
  }
}
