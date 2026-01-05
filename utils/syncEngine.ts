import { db, InventoryItem } from '../db.ts';
import { supabase, getShopId, setShopId } from './supabase.ts';
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
  private lastRealtimeUpdate = 0;
  private pendingRealtimeUpdates: any[] = [];

  constructor() {
    window.addEventListener('online', () => {
      console.log("Sync: Device online, initiating background sync...");
      this.triggerBackgroundSync();
    });
    
    // Background Sync Loop - Every 15 seconds
    setInterval(() => {
      this.triggerBackgroundSync();
    }, 15000);

    this.init();
  }

  private async init() {
    // Ensure Dexie settings are synced with localStorage for Shop ID
    const setting = await db.settings.get('shop_cloud_uuid');
    if (setting?.value && !localStorage.getItem('shop_cloud_uuid')) {
      localStorage.setItem('shop_cloud_uuid', setting.value);
    }

    const shopId = getShopId();
    if (!shopId) {
      console.error("Sync Error: No Shop ID found on this device. Staff must join via link.");
      return;
    }
    
    console.log("Sync: Initializing connection for Shop ID:", shopId);
    
    if (navigator.onLine) {
      // Force "Initial Pull" if inventory is empty
      const count = await db.inventory.count();
      if (count === 0) {
        console.log("Sync: Local inventory empty, forcing first-time pull...");
        await this.performInitialPull();
      }
      this.startRealtimeListener();
    }
    this.updateStatus();
  }

  private triggerBackgroundSync() {
    if (!navigator.onLine || this.isSyncing) return;
    this.sync(); 
    this.startRealtimeListener();
  }

  /**
   * Forcefully pull Inventory AND Categories from Supabase.
   */
  public async performInitialPull() {
    if (!navigator.onLine) return;
    const shopId = getShopId();
    if (!shopId) {
      console.error("Sync: Cannot pull, Shop ID missing");
      return;
    }

    this.onStatusChange('pulling');
    try {
      console.debug('Sync: Starting Full Cloud Pull for shop:', shopId);
      
      // 1. Pull Inventory
      const { data: cloudItems, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', shopId);

      if (invError) throw invError;

      if (cloudItems) {
        const dexieItems = cloudItems.map(item => this.mapCloudToLocal(item));
        await db.inventory.bulkPut(dexieItems as InventoryItem[]);
      }

      // 2. Pull Categories
      const { data: cloudCats, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('shop_id', shopId);
      
      if (!catError && cloudCats) {
        const dexieCats = cloudCats.map(cat => ({
          uuid: cat.uuid,
          name: cat.name,
          image: cat.image,
          dateCreated: cat.date_created,
          last_updated: cat.last_updated,
          synced: 1
        }));
        await db.categories.bulkPut(dexieCats);
      }
      
      console.log(`Sync: Pull success for shop ${shopId}.`);
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      this.onStatusChange('synced');
      return true;
    } catch (err: any) {
      console.error('Sync: Full pull failed', err.message);
      this.onStatusChange('error');
      return false;
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
          this.pendingRealtimeUpdates.push(payload);
          this.processThrottledUpdates();
        }
      )
      .subscribe();
  }

  private async processThrottledUpdates() {
    const now = Date.now();
    if (now - this.lastRealtimeUpdate < 1000) return; 

    this.lastRealtimeUpdate = now;
    const updates = [...this.pendingRealtimeUpdates];
    this.pendingRealtimeUpdates = [];

    for (const payload of updates) {
      const { eventType, new: newItem, old: oldItem } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const dexieData = this.mapCloudToLocal(newItem);
        const existing = await db.inventory.where('uuid').equals(newItem.uuid).first();
        if (existing) await db.inventory.update(existing.id!, dexieData);
        else await db.inventory.add(dexieData);
      } else if (eventType === 'DELETE' && oldItem?.uuid) {
        await db.inventory.where('uuid').equals(oldItem.uuid).delete();
      }
    }
    localStorage.setItem('last_inventory_sync', Date.now().toString());
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
        const table = (db as any)[tableName];
        if (table) count += await table.where('synced').equals(0).count();
      }
      return count;
    } catch { return 0; }
  }

  public async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    const shopId = getShopId();
    if (!shopId) return;
    
    this.isSyncing = true;
    this.onStatusChange('pending');
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Timeout')), 15000));

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
      this.onStatusChange(error.message === 'Sync Timeout' ? 'offline' : 'error');
    } finally {
      this.isSyncing = false;
      this.updateStatus();
    }
  }
}

export const syncEngine = new SyncEngine();