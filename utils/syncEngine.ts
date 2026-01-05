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
  private currentListenerShopId: string | null = null;

  constructor() {
    // 1. Listen for online events
    window.addEventListener('online', () => {
      console.log("SyncEngine: Device online, initiating sync...");
      this.sync();
      this.startRealtimeListener();
    });
    
    // 2. Background Sync Loop: Checks every 30s
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
        // Ensure listener is active if shopId was recently set
        this.startRealtimeListener();
      } else {
        this.updateStatus();
      }
    }, 30 * 1000);

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
   */
  public async performInitialPull() {
    if (!navigator.onLine) return;
    const shopId = getShopId();
    if (!shopId) return;

    try {
      console.debug('SyncEngine: Performing Full Cloud Pull for shop:', shopId);
      
      const { data: cloudItems, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', shopId);

      if (error) throw error;

      if (cloudItems) {
        const dexieItems = cloudItems.map(item => this.mapCloudToLocal(item));
        // bulkPut overwrites local with cloud Master copy
        await db.inventory.bulkPut(dexieItems as InventoryItem[]);
        console.log(`SyncEngine: Pulled ${dexieItems.length} products from cloud.`);
      }
      
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      this.updateStatus();
    } catch (err) {
      console.error('SyncEngine: Full pull failed', err);
      this.onStatusChange('error');
    }
  }

  /**
   * Field mapper to handle Snake Case (Supabase) to Camel Case (Dexie)
   */
  private mapCloudToLocal(item: any): InventoryItem {
    return {
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
    } as InventoryItem;
  }

  /**
   * Connects to Supabase Realtime to listen for inventory updates.
   * Handles INSERT, UPDATE, and DELETE.
   */
  private startRealtimeListener() {
    const shopId = getShopId();
    if (!shopId) return;
    
    // Skip if already listening to this shop
    if (this.realtimeChannel && this.currentListenerShopId === shopId) return;

    // Cleanup old channel if switching shops or restarting
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    console.debug('SyncEngine: Starting Realtime Listener for shop:', shopId);
    this.currentListenerShopId = shopId;

    this.realtimeChannel = supabase
      .channel(`inventory_changes_${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `shop_id=eq.${shopId}`
        },
        async (payload) => {
          const { eventType, new: newItem, old: oldItem } = payload;
          
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            console.log(`Cloud Sync: Local stock updated for ${newItem.name}`);
            const dexieData = this.mapCloudToLocal(newItem);
            
            const existing = await db.inventory.where('uuid').equals(newItem.uuid).first();
            if (existing) {
              await db.inventory.update(existing.id!, dexieData);
            } else {
              await db.inventory.add(dexieData);
            }
          } 
          else if (eventType === 'DELETE') {
            console.log('Cloud Sync: Item deleted in cloud, removing locally...');
            if (oldItem && oldItem.uuid) {
              await db.inventory.where('uuid').equals(oldItem.uuid).delete();
            }
          }
          
          localStorage.setItem('last_inventory_sync', Date.now().toString());
          this.updateStatus();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("SyncEngine: Real-time Cloud Active ✅");
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
      // Database might be closed or busy
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
      await pushToCloud();
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