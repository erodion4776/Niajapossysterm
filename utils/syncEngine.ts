import { db } from '../db.ts';
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
   * Main Sync Execution Logic (Bidirectional)
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
      // 1. Push Local Changes to Cloud
      await pushToCloud();
      
      // 2. Pull Remote Changes from Cloud
      await pullFromCloud();
      
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
   * Helper to manually trigger an opportunistic sync (e.g. after a big sale)
   */
  public trigger() {
    this.sync();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();