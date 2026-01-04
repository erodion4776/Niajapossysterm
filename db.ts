
import Dexie, { Table } from 'dexie';

export interface Category {
  id?: string | number;
  uuid: string; // Cloud unique ID
  name: string;
  image?: string; 
  dateCreated?: number;
  last_updated?: number;
  synced?: number; // 0 for false, 1 for true
}

export interface InventoryItem {
  id?: string | number;
  uuid: string; // Cloud unique ID
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit?: string; 
  supplierName?: string; 
  minStock?: number;
  expiryDate?: string;
  category: string;
  barcode?: string;
  dateAdded?: string;
  image?: string; 
  last_updated?: number;
  synced?: number;
}

export interface Customer {
  id?: number;
  uuid: string; // Cloud unique ID
  name: string;
  phone: string;
  walletBalance: number;
  lastTransaction: number;
  last_updated?: number;
  synced?: number;
}

export interface User {
  id?: string | number;
  uuid: string; // Cloud unique ID
  name: string;
  pin: string;
  role: 'Admin' | 'Staff';
  email?: string;
  avatar?: string;
  last_updated?: number;
  synced?: number;
}

export interface SaleItem {
  id: string | number;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
}

export interface Sale {
  id?: string | number;
  uuid: string; // Primary key for cloud sync
  items: SaleItem[];
  total: number;
  totalCost: number;
  walletUsed?: number;
  walletSaved?: number;
  cashPaid?: number;
  paymentMethod: 'Cash' | 'Transfer' | 'Card' | 'Wallet' | 'Debt' | 'Partial';
  timestamp: number;
  staff_id: string;
  staff_name: string;
  customer_phone?: string;
  last_updated?: number;
  synced?: number;
}

export interface ParkedOrder {
  id?: number;
  cartItems: (SaleItem & { image?: string })[];
  total: number;
  customerNote: string;
  timestamp: number;
  staff_id: string;
}

export interface Expense {
  id?: string | number;
  uuid: string; // Cloud unique ID
  description: string;
  amount: number;
  date: string | number;
  last_updated?: number;
  synced?: number;
}

export interface Debt {
  id?: string | number;
  uuid: string; // Cloud unique ID
  sale_uuid?: string; 
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  remainingBalance: number;
  items: string;
  date: number;
  lastReminderSent?: number;
  status: 'Unpaid' | 'Paid';
  note?: string;
  last_updated?: number;
  synced?: number;
}

export interface StockLog {
  id?: number;
  item_id: string | number;
  itemName: string;
  quantityChanged: number;
  previousStock: number;
  newStock: number;
  type: 'Addition' | 'Manual Update' | 'Sales Deduction' | 'Reconciliation Deduction';
  date: number;
  staff_name: string;
  supplierName?: string; 
}

export interface Setting {
  key: string;
  value: any;
}

export interface SecurityRecord {
  key: string;
  value: any;
}

export type NaijaShopDatabase = Dexie & {
  inventory: Table<InventoryItem>;
  categories: Table<Category>;
  customers: Table<Customer>;
  sales: Table<Sale>;
  settings: Table<Setting>;
  security: Table<SecurityRecord>;
  users: Table<User>;
  expenses: Table<Expense>;
  debts: Table<Debt>;
  stock_logs: Table<StockLog>;
  parked_orders: Table<ParkedOrder>;
};

const dexieDb = new Dexie('NaijaShopDB') as NaijaShopDatabase;

dexieDb.version(27).stores({
  inventory: '++id, &uuid, name, sellingPrice, stock, category, barcode, expiryDate, minStock, unit, supplierName, synced, last_updated',
  categories: '++id, &uuid, &name, synced, last_updated',
  customers: '++id, &uuid, &phone, name, walletBalance, lastTransaction, synced, last_updated',
  sales: '++id, &uuid, timestamp, total, staff_id, staff_name, customer_phone, synced, last_updated',
  settings: 'key',
  security: 'key',
  users: '++id, &uuid, name, pin, role, synced, last_updated',
  expenses: '++id, &uuid, date, amount, synced, last_updated',
  debts: '++id, &uuid, customerName, customerPhone, status, date, remainingBalance, sale_uuid, synced, last_updated',
  stock_logs: '++id, item_id, itemName, type, date, staff_name',
  parked_orders: '++id, timestamp, staff_id'
});

export const db = dexieDb;

export async function initTrialDate() {
  let installDateStr = localStorage.getItem('install_date');
  if (!installDateStr) {
    installDateStr = Date.now().toString();
    localStorage.setItem('install_date', installDateStr);
  }
  
  const trialStartValue = parseInt(installDateStr);
  const dbTrialStart = await db.settings.get('trial_start');
  if (!dbTrialStart) {
    await db.settings.put({ key: 'trial_start', value: trialStartValue });
  }

  // Shop UUID for Cloud Sync
  let shopUuid = localStorage.getItem('shop_cloud_uuid');
  if (!shopUuid) {
    shopUuid = crypto.randomUUID();
    localStorage.setItem('shop_cloud_uuid', shopUuid);
  }

  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }

  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd([
      { uuid: crypto.randomUUID(), name: 'Uncategorized', dateCreated: Date.now(), last_updated: Date.now(), synced: 0 },
      { uuid: crypto.randomUUID(), name: 'Drinks', dateCreated: Date.now(), last_updated: Date.now(), synced: 0 },
      { uuid: crypto.randomUUID(), name: 'Food', dateCreated: Date.now(), last_updated: Date.now(), synced: 0 },
      { uuid: crypto.randomUUID(), name: 'General', dateCreated: Date.now(), last_updated: Date.now(), synced: 0 }
    ]);
  }
}

export async function clearAllData() {
  await db.transaction('rw', [db.inventory, db.categories, db.customers, db.sales, db.settings, db.security, db.users, db.expenses, db.debts, db.stock_logs, db.parked_orders], async () => {
    await db.inventory.clear();
    await db.categories.clear();
    await db.customers.clear();
    await db.sales.clear();
    await db.settings.clear();
    await db.security.clear();
    await db.users.clear();
    await db.expenses.clear();
    await db.debts.clear();
    await db.stock_logs.clear();
    await db.parked_orders.clear();
  });
}
