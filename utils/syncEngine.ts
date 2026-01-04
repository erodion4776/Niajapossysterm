
import { db } from '../db.ts';
import { supabase, isSupabaseConfigured } from './supabase.ts';
import { getRequestCode } from './security.ts';

const SYNCABLE_TABLES = ['inventory', 'categories', 'customers', 'sales', 'expenses', 'debts', 'users'] as const;

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

class SyncEngine {
  private isSyncing = false;
  private onStatusChange: (status: SyncStatus) => void = () => {};

  constructor() {
    // Check online status and start the sync loop
    window.addEventListener('online', () => this.sync());
    
    // Interval: Every 30 seconds as requested
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
    for (const tableName of SYNCABLE_TABLES) {
      const table = (db as any)[tableName];
      count += await table.where('synced').equals(0).count();
    }
    return count;
  }

  /**
   * Main Sync Logic
   */
  public async sync() {
    // 1. Logic Check: Every 30 seconds, check if the device is navigator.onLine
    if (this.isSyncing || !navigator.onLine || !isSupabaseConfigured) {
      this.updateStatus();
      return;
    }
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    // 5. Shop ID: Ensure every record sent to Supabase includes the shop_id (Boss's Request Code)
    const shopId = await getRequestCode();
    
    try {
      for (const tableName of SYNCABLE_TABLES) {
        await this.syncTable(tableName, shopId);
      }
      this.onStatusChange('synced');
    } catch (error) {
      console.error('Cloud Sync error:', error);
      this.onStatusChange('error');
    } finally {
      this.isSyncing = false;
      this.updateStatus();
    }
  }

  private async syncTable(tableName: string, shopId: string) {
    const table = (db as any)[tableName];
    
    // 2. Push Local Changes: Look for any records that have a synced: 0 flag (false)
    const unsynced = await table.where('synced').equals(0).toArray();
    
    if (unsynced.length > 0) {
      // Prepare payload with shop identification
      const payload = unsynced.map(item => ({
        ...item,
        uuid: item.uuid || crypto.randomUUID(),
        shop_id: shopId,
        synced: 1, // Will be marked as synced in the cloud copy
        last_updated: item.last_updated || Date.now()
      }));

      // 3. Supabase Upsert: Use upsert() to push these records to the cloud
      // Using 'uuid' as the unique constraint for conflicts
      const { error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'uuid' });

      if (!error) {
        // 4. Mark as Synced: Once Supabase confirms success, update local Dexie record to synced: 1 (true)
        const uuids = payload.map(p => p.uuid);
        await table.where('uuid').anyOf(uuids).modify({ synced: 1 });
      } else {
        throw error;
      }
    }
  }

  /**
   * Helper to manually trigger an opportunistic sync after a record change
   */
  public trigger() {
    this.sync();
  }
}

export const syncEngine = new SyncEngine();
