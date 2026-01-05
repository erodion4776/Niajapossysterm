import { db, InventoryItem } from '../db.ts';
import { supabase, getShopId } from './supabase.ts';
import { pullFromCloud, pushToCloud } from '../services/syncService.ts';

/**
 * Tables that need to be synchronized to the cloud.
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

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error' | 'pulling';

class SyncEngine {
  private isSyncing = false;
  private onStatusChange: (status: SyncStatus) => void = () => {};
  private realtimeChannel: any = null;
  private currentListenerShopId: string | null = null;

  constructor() {
    // 1. Listen for online events
    window.addEventListener('online', () => {
      console.log("Sync: Device online, initiating sync...");
      this.sync();
      this.startRealtimeListener();
    });
    
    // 2. Background Sync Loop
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
        this.startRealtimeListener();
      } else {
        this.updateStatus();
      }
    }, 45 * 1000);

    this.init();
  }

  private async init() {
    const shopId = getShopId();
    console.log("Sync: Starting connection for Shop ID:", shopId);
    
    if (navigator.onLine && shopId) {
      // Check if inventory is empty - force initial pull if so
      const count = await db.inventory.count();
      if (count === 0) {
        console.log("Sync: Local inventory empty, forcing initial pull...");
        await this.performInitialPull();
      }
      this.startRealtimeListener();
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

    this.onStatusChange('pulling');
    try {
      console.debug('Sync: Attempting Full Cloud Pull for shop:', shopId);
      
      const { data: cloudItems, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', shopId);

      if (error) {
        console.error("Sync Error:", error.message);
        alert(`Cloud Sync Error: ${error.message}. Please check if RLS policies are enabled.`);
        throw error;
      }

      if (cloudItems) {
        const dexieItems = cloudItems.map(item => this.mapCloudToLocal(item));
        await db.inventory.bulkPut(dexieItems as InventoryItem[]);
        console.log(`Sync: Successfully pulled ${dexieItems.length} products.`);
      }
      
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      this.updateStatus();
    } catch (err) {
      console.error('Sync: Full pull failed', err);
      this.onStatusChange('error');
    }
  }

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

  private startRealtimeListener() {
    const shopId = getShopId();
    if (!shopId || (this.realtimeChannel && this.currentListenerShopId === shopId)) return;

    if (this.realtimeChannel) supabase.removeChannel(this.realtimeChannel);

    this.currentListenerShopId = shopId;
    this.realtimeChannel = supabase
      .channel(`inventory_changes_${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory', filter: `shop_id=eq.${shopId}` },
        async (payload) => {
          const { eventType, new: newItem, old: oldItem } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            console.log('Cloud Sync: Local stock updated for', newItem.name);
            const dexieData = this.mapCloudToLocal(newItem);
            const existing = await db.inventory.where('uuid').equals(newItem.uuid).first();
            if (existing) await db.inventory.update(existing.id!, dexieData);
            else await db.inventory.add(dexieData);
          } else if (eventType === 'DELETE' && oldItem?.uuid) {
            await db.inventory.where('uuid').equals(oldItem.uuid).delete();
          }
          localStorage.setItem('last_inventory_sync', Date.now().toString());
          this.updateStatus();
        }
      )
      .subscribe();
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
    try {
      let count = 0;
      for (const tableName of SYNCABLE_TABLES) {
        count += await (db as any)[tableName].where('synced').equals(0).count();
      }
      return count;
    } catch { return 0; }
  }

  /**
   * Main Sync Execution with Timeout Protection
   */
  public async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    const shopId = getShopId();
    if (!shopId) return;
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    // 10 Second Timeout to prevent "Orange Spinner" getting stuck
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sync Timeout')), 10000)
    );

    try {
      await Promise.race([
        (async () => {
          await pushToCloud();
          await pullFromCloud();
        })(),
        timeout
      ]);
      this.onStatusChange('synced');
    } catch (error: any) {
      console.warn('Sync loop skipped or timed out:', error.message);
      this.onStatusChange(error.message === 'Sync Timeout' ? 'offline' : 'error');
    } finally {
      this.isSyncing = false;
      this.updateStatus();
    }
  }
}

export const syncEngine = new SyncEngine();