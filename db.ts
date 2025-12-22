
import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
}

export interface User {
  id?: number;
  name: string;
  pin: string;
  role: 'Admin' | 'Staff';
}

export interface SaleItem {
  id: number;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  total: number;
  totalCost: number;
  timestamp: number;
  staff_id: string;
  staff_name: string;
}

export interface Setting {
  key: string;
  value: any;
}

export type NaijaShopDatabase = Dexie & {
  inventory: Table<InventoryItem>;
  sales: Table<Sale>;
  settings: Table<Setting>;
  users: Table<User>;
};

const dexieDb = new Dexie('NaijaShopDB') as NaijaShopDatabase;

dexieDb.version(3).stores({
  inventory: '++id, name, sellingPrice, stock, category',
  sales: '++id, timestamp, total, staff_id, staff_name',
  settings: 'key',
  users: '++id, name, pin, role'
});

export const db = dexieDb;

export async function initTrialDate() {
  const trialStart = localStorage.getItem('install_date');
  if (!trialStart) {
    localStorage.setItem('install_date', Date.now().toString());
  }
  
  // Request persistent storage
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage persisted: ${isPersisted}`);
  }

  // Ensure an initial Admin exists if the DB is empty
  const adminCount = await db.users.where('role').equals('Admin').count();
  if (adminCount === 0) {
    await db.users.add({
      name: 'Shop Owner',
      pin: '0000',
      role: 'Admin'
    });
  }
}

export async function clearAllData() {
  await db.transaction('rw', [db.inventory, db.sales, db.settings, db.users], async () => {
    await db.inventory.clear();
    await db.sales.clear();
    await db.settings.clear();
    await db.users.clear();
  });
}
