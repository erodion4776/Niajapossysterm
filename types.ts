
export enum Page {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  SALES = 'SALES',
  SETTINGS = 'SETTINGS',
  FAQ = 'FAQ',
  DEBTS = 'DEBTS',
  EXPENSES = 'EXPENSES',
  CUSTOMERS = 'CUSTOMERS',
  STOCK_LOGS = 'STOCK_LOGS',
  CATEGORY_MANAGER = 'CATEGORY_MANAGER',
  HELP_CENTER = 'HELP_CENTER',
  ABOUT_US = 'ABOUT_US',
  AFFILIATES = 'AFFILIATES',
  AI_ASSISTANT = 'AI_ASSISTANT',
  NOTIFICATIONS = 'NOTIFICATIONS'
}

export type Role = 'Admin' | 'Staff';
export type UserRole = Role; // Alias for backward compatibility
export type DeviceRole = 'Owner' | 'StaffDevice';
