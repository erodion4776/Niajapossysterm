
import { db } from '../db.ts';
import { supabase, getShopId } from './supabase.ts';

/**
 * Tables that need to be synchronized to the cloud for a complete shop overview.
 */
const SYNCABLE_TABLES = [
  'inventory',
  'categories',
  'customers',
  'sales',
  'expenses',
  'debts',
  'users'
] as const;

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

class SyncEngine {
  private isSyncing = false;
  private onStatusChange: (status: SyncStatus) => void = () => {};

  constructor() {
    // 1. Listen for online events to trigger immediate sync
    window.addEventListener('online', () => this.sync());
    
    // 2. The Sync Loop: Every 30 seconds, check if the device is navigator.onLine
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      } else {
        this.updateStatus();
      }
    }, 30 * 1000);
  }

  /**
   * Subscribe to sync status updates (for UI indicators)
   */
  public subscribeStatus(callback: (status: SyncStatus) => void) {
    this.onStatusChange = callback;
    this.updateStatus();
  }

  private async updateStatus() {
    if (!navigator.onLine) {
      this.onStatusChange('offline');
      return;
    }
    
    const pendingCount = await this.getPendingCount();
    this.onStatusChange(pendingCount > 0 ? 'pending' : 'synced');
  }

  private async getPendingCount(): Promise<number> {
    let count = 0;
    try {
      for (const tableName of SYNCABLE_TABLES) {
        const table = (db as any)[tableName];
        // synced: 0 means "not yet pushed to cloud"
        count += await table.where('synced').equals(0).count();
      }
    } catch (e) {
      console.warn("SyncEngine: Error counting pending records", e);
    }
    return count;
  }

  /**
   * Main Sync Execution Logic
   */
  public async sync() {
    // Safety checks: skip if already syncing or offline
    if (this.isSyncing || !navigator.onLine) {
      this.updateStatus();
      return;
    }
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    try {
      // 5. Shop ID: Every record sent to Supabase must include the shop_id
      // Using the persistent Shop UUID from the consolidated supabase utility
      const shopId = getShopId();
      
      // Process tables sequentially
      for (const tableName of SYNCABLE_TABLES) {
        await this.syncTable(tableName, shopId);
      }
      
      this.onStatusChange('synced');
    } catch (error) {
      console.error('NaijaShop Cloud Sync Loop Error:', error);
      this.onStatusChange('error');
    } finally {
      this.isSyncing = false;
      this.updateStatus();
    }
  }

  /**
   * Pushes unsynced changes for a specific table to Supabase.
   */
  private async syncTable(tableName: string, shopId: string) {
    const table = (db as any)[tableName];
    
    // Push Local Changes: Look for any records in Dexie that have a synced: 0 flag.
    const unsyncedRecords = await table.where('synced').equals(0).toArray();
    
    if (unsyncedRecords.length > 0) {
      // Prepare payload: Strip local auto-increment IDs and ensure UUID + ShopID
      const payload = unsyncedRecords.map(record => {
        const { id, ...dataToSync } = record;
        return {
          ...dataToSync,
          uuid: record.uuid || crypto.randomUUID(), // Guarantee UUID
          shop_id: shopId,                          // Attach device/shop identity
          synced: 1,                                // Set to synced for the cloud copy
          last_updated: record.last_updated || Date.now()
        };
      });

      // Supabase Upsert: Use uuid as the primary key for all upserts.
      const { error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'uuid' });

      if (!error) {
        // Mark as Synced: Update local Dexie records once cloud confirms success.
        const successfullyPushedUuids = payload.map(p => p.uuid);
        await table.where('uuid').anyOf(successfullyPushedUuids).modify({ synced: 1 });
        console.debug(`SyncEngine: Successfully pushed ${payload.length} records to ${tableName}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Helper to manually trigger an opportunistic sync (e.g. after a big sale)
   */
  public trigger() {
    this.sync();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
