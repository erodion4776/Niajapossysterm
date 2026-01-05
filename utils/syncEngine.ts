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
  private lastRealtimeUpdate = 0;
  private pendingRealtimeUpdates: any[] = [];

  constructor() {
    // 1. Listen for online events
    window.addEventListener('online', () => {
      console.log("Sync: Device online, initiating background sync...");
      this.triggerBackgroundSync();
    });
    
    // 2. Background Sync Loop - Every 15 seconds (Local-First requirement)
    setInterval(() => {
      this.triggerBackgroundSync();
    }, 15000);

    this.init();
  }

  private async init() {
    const shopId = getShopId();
    console.log("Sync: Initializing connection for Shop ID:", shopId);
    
    if (navigator.onLine && shopId) {
      // Force "Initial Pull" for Staff or fresh installs
      const count = await db.inventory.count();
      if (count === 0) {
        console.log("Sync: Local inventory empty, forcing initial pull...");
        await this.performInitialPull();
      }
      this.startRealtimeListener();
    }
    this.updateStatus();
  }

  private triggerBackgroundSync() {
    if (!navigator.onLine || this.isSyncing) return;
    this.sync(); // Non-blocking fire-and-forget
    this.startRealtimeListener();
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
      console.debug('Sync: Starting Full Cloud Pull for shop:', shopId);
      
      const { data: cloudItems, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', shopId);

      if (error) {
        console.error("Sync: Fetch failed", error.message);
        throw error;
      }

      if (cloudItems) {
        const dexieItems = cloudItems.map(item => this.mapCloudToLocal(item));
        await db.inventory.bulkPut(dexieItems as InventoryItem[]);
        console.log(`Sync: Initial pull success, ${dexieItems.length} products added.`);
      }
      
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      this.onStatusChange('synced');
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

  /**
   * Real-time Subscription (The "Listener")
   * Throttled: Buffers multiple changes and updates every 1s to prevent hanging.
   */
  private startRealtimeListener() {
    const shopId = getShopId();
    if (!shopId || (this.realtimeChannel && this.currentListenerShopId === shopId)) return;

    if (this.realtimeChannel) supabase.removeChannel(this.realtimeChannel);

    console.log("Sync: Starting Real-time Inventory Listener...");
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
    if (now - this.lastRealtimeUpdate < 1000) return; // Wait 1s between UI updates

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
        count += await (db as any)[tableName].where('synced').equals(0).count();
      }
      return count;
    } catch { return 0; }
  }

  /**
   * Background Sync Loop with 10s Timeout Protection
   */
  public async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    const shopId = getShopId();
    if (!shopId) return;
    
    this.isSyncing = true;
    this.onStatusChange('pending');

    // 10 Second Timeout
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sync Timeout')), 10000)
    );

    try {
      await Promise.race([
        (async () => {
          // Push local changes (synced=0)
          await pushToCloud();
          // Pull remote changes
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