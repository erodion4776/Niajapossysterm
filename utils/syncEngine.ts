import { db, InventoryItem } from '../db.ts';
import { supabase, getShopId } from './supabase.ts';
import { pullFromCloud, pushToCloud } from '../services/syncService.ts';

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
  private realtimeChannel: any = null;

  constructor() {
    // 1. Listen for online events to trigger immediate sync
    window.addEventListener('online', () => {
      this.sync();
      this.startRealtimeListener();
    });
    
    // 2. The Sync Loop: Every 30 seconds, check if the device is navigator.onLine
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      } else {
        this.updateStatus();
      }
    }, 30 * 1000);

    // 3. Start Realtime Listener if online
    if (navigator.onLine) {
      this.startRealtimeListener();
      this.performInitialPull();
    }
  }

  /**
   * Performs a forceful full inventory pull from Supabase.
   * Useful on login or when the app resumes.
   */
  public async performInitialPull() {
    if (!navigator.onLine) return;
    try {
      console.debug('SyncEngine: Performing initial inventory pull...');
      await pullFromCloud();
      this.updateStatus();
    } catch (err) {
      console.warn('SyncEngine: Initial pull failed', err);
    }
  }

  /**
   * Connects to Supabase Realtime to listen for inventory updates.
   * This is what keeps Staff prices/stock updated when Admin makes changes.
   */
  private startRealtimeListener() {
    const shopId = getShopId();
    if (!shopId || this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel(`inventory_updates_${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `shop_id=eq.${shopId}`
        },
        async (payload) => {
          console.debug('SyncEngine: Real-time inventory change detected', payload);
          if (payload.new) {
            const item = payload.new as any;
            const dexieData: Partial<InventoryItem> = {
              uuid: item.uuid,
              name: item.name,
              costPrice: item.cost_price,
              sellingPrice: item.selling_price,
              stock: item.stock,
              unit: item.unit,
              supplierName: item.supplier_name,
              minStock: item.min_stock,
              expiryDate: item.expiry_date,
              category: item.category,
              barcode: item.barcode,
              dateAdded: item.date_added,
              image: item.image,
              last_updated: item.last_updated,
              synced: 1
            };

            const localItem = await db.inventory.where('uuid').equals(item.uuid).first();
            if (localItem) {
              await db.inventory.update(localItem.id!, dexieData);
            } else {
              await db.inventory.add(dexieData as InventoryItem);
            }
            
            // Trigger UI update
            this.updateStatus();
            localStorage.setItem('last_inventory_sync', Date.now().toString());
          }
        }
      )
      .subscribe();
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
        count += await table.where('synced').equals(0).count();
      }
    } catch (e) {
      console.warn("SyncEngine: Error counting pending records", e);
    }
    return count;
  }

  /**
   * Main Sync Execution Logic (Bidirectional)
   */
  public async sync() {
    if (this.isSyncing || !navigator.onLine) {
      this.updateStatus();
      return;
    }
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    try {
      await pushToCloud();
      await pullFromCloud();
      this.onStatusChange('synced');
      localStorage.setItem('last_inventory_sync', Date.now().toString());
    } catch (error) {
      console.error('NaijaShop Cloud Sync Loop Error:', error);
      this.onStatusChange('error');
    } finally {
      this.isSyncing = false;
      this.updateStatus();
    }
  }

  public trigger() {
    this.sync();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();