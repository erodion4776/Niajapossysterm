import Dexie, { Table } from 'dexie';

export interface InventoryItem {
  id?: string | number;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock?: number; // New: Minimum stock threshold
  expiryDate?: string; // New: ISO date string for expiration
  category: string;
  barcode?: string;
  dateAdded?: string;
}

export interface User {
  id?: string | number;
  name: string;
  pin: string;
  role: 'Admin' | 'Staff';
  email?: string;
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
  uuid: string; // Unique identifier for reconciliation
  items: SaleItem[];
  total: number;
  totalCost: number;
  timestamp: number;
  staff_id: string;
  staff_name: string;
}

export interface Expense {
  id?: string | number;
  description: string;
  amount: number;
  date: string | number;
}

export interface Debt {
  id?: string | number;
  customerName: string;
  customerPhone: string;
  amount: number;
  timestamp: number;
  status: 'Unpaid' | 'Paid';
  note?: string;
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
  expenses: Table<Expense>;
  debts: Table<Debt>;
};

const dexieDb = new Dexie('NaijaShopDB') as NaijaShopDatabase;

// Incremented version to 11 to update schema
dexieDb.version(11).stores({
  inventory: '++id, name, sellingPrice, stock, category, barcode, expiryDate, minStock',
  sales: '++id, uuid, timestamp, total, staff_id, staff_name',
  settings: 'key',
  users: '++id, name, pin, role',
  expenses: '++id, date, amount',
  debts: '++id, customerName, customerPhone, status, timestamp'
});

export const db = dexieDb;

/**
 * Initializes basic shop data and trial tracking.
 */
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

  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }

  const deviceRole = localStorage.getItem('device_role');
  const isStaffDevice = deviceRole === 'StaffDevice';
  
  if (!deviceRole) return;

  const userCount = await db.users.count();
  
  if (userCount === 0 && deviceRole === 'Owner') {
    await db.users.add({
      name: 'Shop Owner',
      pin: '0000',
      role: 'Admin'
    });
  }
}

export async function clearAllData() {
  await db.transaction('rw', [db.inventory, db.sales, db.settings, db.users, db.expenses, db.debts], async () => {
    await db.inventory.clear();
    await db.sales.clear();
    await db.settings.clear();
    await db.users.clear();
    await db.expenses.clear();
    await db.debts.clear();
  });
}