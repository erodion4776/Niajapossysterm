
import { db } from '../db.ts';
import { supabase, isSupabaseConfigured } from './supabase.ts';
import { getRequestCode } from './security.ts';

/**
 * SYNCABLE_TABLES: Defined by the core data required for a full shop cloud view.
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
    // 1. Initial trigger and network listeners
    window.addEventListener('online', () => this.sync());
    
    // 2. The Sync Loop: Every 30 seconds, check if the device is navigator.onLine
    setInterval(() => this.sync(), 30 * 1000);
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
        // Dexie stores boolean-like synced flag as 0 (false) or 1 (true)
        count += await table.where('synced').equals(0).count();
      }
    } catch (e) {
      console.warn("SyncEngine: Error counting pending records", e);
    }
    return count;
  }

  /**
   * Main Sync Execution
   */
  public async sync() {
    if (this.isSyncing || !navigator.onLine || !isSupabaseConfigured) {
      this.updateStatus();
      return;
    }
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    // 5. Shop ID: Fetch the Boss's unique Request Code for identification
    const shopId = await getRequestCode();
    
    try {
      // Process each table sequentially to ensure reliable batching
      for (const tableName of SYNCABLE_TABLES) {
        await this.syncTable(tableName, shopId);
      }
      this.onStatusChange('synced');
    } catch (error) {
      console.error('NaijaShop Cloud Sync Error:', error);
      this.onStatusChange('error');
    } finally {
      this.isSyncing = false;
      this.updateStatus();
    }
  }

  /**
   * Synchronizes a specific Dexie table with its Supabase counterpart.
   */
  private async syncTable(tableName: string, shopId: string) {
    const table = (db as any)[tableName];
    
    // 2. Push Local Changes: Find any records with synced: 0
    const unsynced = await table.where('synced').equals(0).toArray();
    
    if (unsynced.length > 0) {
      // 3. Prepare Payload
      const payload = unsynced.map(item => {
        // Strip the local auto-increment 'id' to let the cloud manage its own ID space
        // while relying solely on the 'uuid' for data mapping.
        const { id, ...cleanData } = item;
        
        return {
          ...cleanData,
          uuid: item.uuid || crypto.randomUUID(), // Guarantee a UUID exists
          shop_id: shopId,                      // Always include shop identity
          synced: 1,                            // Target copy should be marked as synced
          last_updated: item.last_updated || Date.now()
        };
      });

      // 3. Supabase Upsert: Pushing local changes to the cloud
      // Strictly uses 'uuid' as the unique constraint to prevent duplicates.
      const { error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'uuid' });

      if (!error) {
        // 4. Mark as Synced locally once Supabase confirms success
        const uuids = payload.map(p => p.uuid);
        await table.where('uuid').anyOf(uuids).modify({ synced: 1 });
        console.debug(`SyncEngine: Uploaded ${payload.length} records to ${tableName}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * opportunistic sync trigger after a local update
   */
  public trigger() {
    this.sync();
  }
}

export const syncEngine = new SyncEngine();
