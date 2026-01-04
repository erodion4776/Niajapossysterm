
import { db } from '../db.ts';
import { supabase, isSupabaseConfigured } from './supabase.ts';

const SYNCABLE_TABLES = ['inventory', 'categories', 'customers', 'sales', 'expenses', 'debts', 'users'] as const;

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

class SyncEngine {
  private isSyncing = false;
  private onStatusChange: (status: SyncStatus) => void = () => {};

  constructor() {
    window.addEventListener('online', () => this.sync());
    // Auto-sync every 3 minutes for more "Live" feel when online
    setInterval(() => this.sync(), 3 * 60 * 1000);
  }

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

  public async sync() {
    if (this.isSyncing || !navigator.onLine || !isSupabaseConfigured) return;
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    const shopId = localStorage.getItem('shop_cloud_uuid');
    if (!shopId) {
      this.isSyncing = false;
      return;
    }

    try {
      for (const tableName of SYNCABLE_TABLES) {
        await this.syncTable(tableName, shopId);
      }
      this.onStatusChange('synced');
    } catch (error) {
      console.error('Sync error:', error);
      this.onStatusChange('error');
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncTable(tableName: string, shopId: string) {
    const table = (db as any)[tableName];
    
    // 1. PUSH: Local -> Cloud
    const unsynced = await table.where('synced').equals(0).toArray();
    if (unsynced.length > 0) {
      // Ensure all items have a UUID before pushing
      const payload = unsynced.map(item => ({
        ...item,
        uuid: item.uuid || crypto.randomUUID(),
        shop_id: shopId,
        synced: 1,
        last_updated: item.last_updated || Date.now()
      }));

      const { error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'uuid' });

      if (!error) {
        // Mark as synced locally
        const uuids = payload.map(p => p.uuid);
        await table.where('uuid').anyOf(uuids).modify({ synced: 1 });
      }
    }

    // 2. PULL: Cloud -> Local
    const lastPullTs = Number(localStorage.getItem(`last_pull_${tableName}`) || 0);
    const { data, error: pullError } = await supabase
      .from(tableName)
      .select('*')
      .eq('shop_id', shopId)
      .gt('last_updated', lastPullTs);

    if (!pullError && data && data.length > 0) {
      for (const remoteItem of data) {
        const localItem = await table.where('uuid').equals(remoteItem.uuid).first();
        
        // Conflict Resolution: Newest wins
        if (!localItem || (remoteItem.last_updated > (localItem.last_updated || 0))) {
          // Destructure to remove supabase-specific fields before putting into Dexie
          const { shop_id, id: supabaseId, ...cleanItem } = remoteItem;
          // Note: local Dexie ID is maintained or generated on put
          await table.put({ 
            ...cleanItem, 
            synced: 1,
            // If it's a sale from another staff, add a flag for UI identification
            is_remote: remoteItem.staff_id !== localStorage.getItem('device_fingerprint')
          });
        }
      }
      
      const maxUpdated = Math.max(...data.map(d => d.last_updated));
      localStorage.setItem(`last_pull_${tableName}`, maxUpdated.toString());
    }
  }

  /**
   * Utility to wrap local updates with sync metadata
   */
  public async trackUpdate(tableName: string, data: any) {
    const table = (db as any)[tableName];
    const update = {
      ...data,
      uuid: data.uuid || crypto.randomUUID(),
      last_updated: Date.now(),
      synced: 0
    };
    const id = await table.put(update);
    this.sync(); // Opportunistic sync
    return id;
  }
}

export const syncEngine = new SyncEngine();
