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
    // 1. Listen for online events
    window.addEventListener('online', () => {
      console.log("SyncEngine: Device online, initiating sync...");
      this.sync();
      this.startRealtimeListener();
    });
    
    // 2. Background Sync Loop
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      } else {
        this.updateStatus();
      }
    }, 60 * 1000); // Once a minute background loop

    // 3. Initial Startup logic
    this.init();
  }

  private async init() {
    if (navigator.onLine) {
      const shopId = getShopId();
      if (shopId) {
        await this.performInitialPull();
        this.startRealtimeListener();
      }
    }
    this.updateStatus();
  }

  /**
   * Performs a forceful full inventory pull from Supabase.
   * This ignores the last sync timestamp to ensure the Staff device is 100% up to date.
   */
  public async performInitialPull() {
    if (!navigator.onLine) return;
    const shopId = getShopId();
    if (!shopId) return;

    try {
      console.debug('SyncEngine: Performing Full Cloud Pull for shop:', shopId);
      
      // Fetch all items from cloud inventory for this shop
      const { data: cloudItems, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', shopId);

      if (error) throw error;

      if (cloudItems && cloudItems.length > 0) {
        const dexieItems = cloudItems.map(item => ({
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
        }));

        // bulkPut preserves existing items but overwrites with cloud data (Master copy)
        await db.inventory.bulkPut(dexieItems as InventoryItem[]);
        console.log(`SyncEngine: Successfully pulled ${dexieItems.length} products from Admin.`);
      }
      
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      this.updateStatus();
    } catch (err) {
      console.error('SyncEngine: Full pull failed', err);
      this.onStatusChange('error');
    }
  }

  /**
   * Connects to Supabase Realtime to listen for inventory updates.
   * This is what keeps Staff prices/stock updated when Admin makes changes.
   */
  private startRealtimeListener() {
    const shopId = getShopId();
    if (!shopId) return;
    
    // Close existing channel if any
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    console.debug('SyncEngine: Starting Realtime Listener for shop:', shopId);

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
          console.debug('SyncEngine: Cloud update detected:', payload);
          
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
              synced: 1 // Crucial: tell Dexie this came from cloud
            };

            const localItem = await db.inventory.where('uuid').equals(item.uuid).first();
            if (localItem) {
              await db.inventory.update(localItem.id!, dexieData);
            } else {
              await db.inventory.add(dexieData as InventoryItem);
            }
            
            localStorage.setItem('last_inventory_sync', Date.now().toString());
            this.updateStatus();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("SyncEngine: Realtime Active ✅");
        }
      });
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

    const shopId = getShopId();
    if (!shopId) return;
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    try {
      // 1. Push local changes
      await pushToCloud();
      // 2. Pull remote changes (Incremental)
      await pullFromCloud();
      
      this.onStatusChange('synced');
    } catch (error) {
      console.error('SyncEngine: Cloud Sync Error:', error);
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