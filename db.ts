
import Dexie, { Table } from 'dexie';

export interface Category {
  id?: string | number;
  name: string;
  image?: string; 
  dateCreated?: number;
}

export interface InventoryItem {
  id?: string | number;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit?: string; // New: Pcs, Packs, etc.
  supplierName?: string; // New: Restock tracking
  minStock?: number;
  expiryDate?: string;
  category: string;
  barcode?: string;
  dateAdded?: string;
  image?: string; 
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  walletBalance: number;
  lastTransaction: number;
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
  uuid: string;
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
  description: string;
  amount: number;
  date: string | number;
}

export interface Debt {
  id?: string | number;
  sale_uuid?: string; // Links debt to specific POS transaction for sync
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  remainingBalance: number;
  items: string;
  date: number;
  lastReminderSent?: number;
  status: 'Unpaid' | 'Paid';
  note?: string;
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
  supplierName?: string; // New: Log supplier info on restock
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

dexieDb.version(24).stores({
  inventory: '++id, name, sellingPrice, stock, category, barcode, expiryDate, minStock, unit, supplierName',
  categories: '++id, name',
  customers: '++id, &phone, name, walletBalance, lastTransaction',
  sales: '++id, uuid, timestamp, total, staff_id, staff_name, customer_phone',
  settings: 'key',
  security: 'key',
  users: '++id, name, pin, role',
  expenses: '++id, date, amount',
  debts: '++id, customerName, customerPhone, status, date, remainingBalance, sale_uuid',
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

  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }

  const deviceRole = localStorage.getItem('device_role');
  if (!deviceRole) return;

  const userCount = await db.users.count();
  if (userCount === 0 && deviceRole === 'Owner') {
    await db.users.add({
      name: 'Shop Owner',
      pin: '0000',
      role: 'Admin'
    });
  }

  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd([
      { name: 'Uncategorized', dateCreated: Date.now() },
      { name: 'Drinks', dateCreated: Date.now() },
      { name: 'Food', dateCreated: Date.now() },
      { name: 'Medicine', dateCreated: Date.now() }
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
