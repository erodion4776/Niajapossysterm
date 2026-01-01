
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData, User as DBUser, Category, InventoryItem } from '../db.ts';
import { 
  backupToWhatsApp, 
  generateShopKey, 
  reconcileStaffSales, 
  generateMasterStockKey, 
  generateStaffInviteKey, 
  decodeShopKey,
  pushInventoryUpdateToStaff,
  applyInventoryUpdate
} from '../utils/whatsapp.ts';
import pako from 'pako';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, HelpCircle, ChevronDown, BookOpen, Loader2, CheckCircle2,
  Moon, Sun, Key, Users, X, Send, Printer, Bluetooth, ShieldAlert, Wifi, TrendingUp, AlertCircle, 
  ChevronRight, MapPin, Phone, Receipt, Info, LogOut, Landmark, CreditCard, Tag, Download, Globe, Gift
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';
import { useTheme } from '../ThemeContext.tsx';
import { connectBluetoothPrinter, disconnectPrinter, isPrinterReady } from '../utils/bluetoothPrinter.ts';

interface SettingsProps {
  user: DBUser;
  role: Role;
  setRole: (role: Role) => void;
  setPage: (page: Page) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, role, setRole, setPage }) => {
  const isAdmin = role === 'Admin';
  const { theme, toggleTheme } = useTheme();
  
  // Shop Branding State
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || 'NaijaShop');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || 'Address, City, Phone');
  const [receiptFooter, setReceiptFooter] = useState(() => localStorage.getItem('receipt_footer') || 'Thank you for your patronage!');

  // Soft POS State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // UI States
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  
  // Modal Data
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });
  const [bulkData, setBulkData] = useState({
    targetCategory: 'All',
    updateType: 'Percentage' as 'Percentage' | 'Fixed',
    targetField: 'Selling Price' as 'Selling Price' | 'Cost Price',
    value: 0
  });

  // Feedback States
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [reconcileResult, setReconcileResult] = useState<{merged: number, skipped: number} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconcileInputRef = useRef<HTMLInputElement>(null);
  const inventoryUpdateRef = useRef<HTMLInputElement>(null);

  const users = useLiveQuery(() => db.users.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const printerName = localStorage.getItem('last_printer_name');

  useEffect(() => {
    const loadSettings = async () => {
      const bn = await db.settings.get('softPosBank');
      const an = await db.settings.get('softPosNumber');
      const anm = await db.settings.get('softPosAccount');
      if (bn) setBankName(bn.value);
      if (an) setAccountNumber(an.value);
      if (anm) setAccountName(anm.value);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem('shop_name', shopName);
  }, [shopName]);

  useEffect(() => {
    localStorage.setItem('shop_info', shopInfo);
  }, [shopInfo]);

  useEffect(() => {
    localStorage.setItem('receipt_footer', receiptFooter);
  }, [receiptFooter]);

  const saveBankDetails = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      alert("Please fill all bank details fields!");
      return;
    }
    await db.settings.put({ key: 'softPosBank', value: bankName.trim() });
    await db.settings.put({ key: 'softPosNumber', value: accountNumber.trim() });
    await db.settings.put({ key: 'softPosAccount', value: accountName.trim() });
    alert("Soft POS Bank Details Updated Successfully!");
  };

  const handleManualInstall = async () => {
    const deferredPrompt = (window as any).deferredPWAPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') (window as any).deferredPWAPrompt = null;
    } else {
      alert("To install NaijaShop:\n\n1. Click the 3 dots (⋮) in your browser corner.\n2. Select 'Install' or 'Add to Home Screen'.\n\nThis makes the app work perfectly offline.");
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const data = {
        inventory: await db.inventory.toArray(),
        sales: await db.sales.toArray(),
        expenses: await db.expenses.toArray(),
        debts: await db.debts.toArray(),
        users: await db.users.toArray(),
        categories: await db.categories.toArray(),
        settings: await db.settings.toArray(),
        security: await db.security.toArray(), // Crucial for license restore
        shopName,
        shopInfo,
        timestamp: Date.now() 
      };
      const result = await backupToWhatsApp(data);
      if (result.success && result.method === 'DOWNLOAD') {
        setBackupFileName(result.fileName || 'NaijaShop_Backup.json.gz');
        setShowBackupSuccess(true);
      }
    } catch (err) {
      alert("Backup failed: " + (err as Error).message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        let jsonStr = '';
        const result = event.target?.result;

        if (file.name.endsWith('.gz')) {
          const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer));
          jsonStr = new TextDecoder().decode(decompressed);
        } else {
          jsonStr = typeof result === 'string' ? result : new TextDecoder().decode(result as ArrayBuffer);
        }

        const data = JSON.parse(jsonStr);
        if (confirm("Replace all local data with this backup? Current records will be deleted!")) {
          // 1. Clear existing local database state first
          await clearAllData();
          
          // 2. Perform Transactional Restore
          await db.transaction('rw', [db.inventory, db.sales, db.expenses, db.debts, db.users, db.categories, db.settings, db.security, db.stock_logs, db.parked_orders], async () => {
            // Restore Inventory
            if (data.inventory) await db.inventory.bulkAdd(data.inventory);
            if (data.sales) await db.sales.bulkAdd(data.sales);
            if (data.expenses) await db.expenses.bulkAdd(data.expenses);
            if (data.debts) await db.debts.bulkAdd(data.debts);
            
            // Fix: Ensure Users table is properly restored from backupData.users
            // Calling clear again within transaction for absolute certainty
            await db.users.clear();
            if (data.users && data.users.length > 0) {
              await db.users.bulkAdd(data.users);
            }
            
            if (data.categories) await db.categories.bulkAdd(data.categories);
            if (data.settings) await db.settings.bulkAdd(data.settings);
            
            // Restore Security (License) table
            if (data.security) await db.security.bulkAdd(data.security);

            // Restore other tables if present
            if (data.stock_logs) await db.stock_logs.bulkAdd(data.stock_logs);
            if (data.parked_orders) await db.parked_orders.bulkAdd(data.parked_orders);
            
            await db.settings.put({ key: 'is_activated', value: true });
          });

          // 3. Restore critical Setup and Setup State in LocalStorage
          localStorage.setItem('is_activated', 'true');
          localStorage.setItem('is_setup_pending', 'false');
          localStorage.removeItem('is_trialing');
          
          if (data.shopName) localStorage.setItem('shop_name', data.shopName);
          if (data.shopInfo) localStorage.setItem('shop_info', data.shopInfo);
          
          // Restore license info from security table in the backup data
          const security = data.security || [];
          const expiryEntry = security.find((s: any) => s.key === 'license_expiry');
          const sigEntry = security.find((s: any) => s.key === 'license_signature');
          
          if (expiryEntry) localStorage.setItem('license_expiry', expiryEntry.value);
          if (sigEntry) localStorage.setItem('license_signature', sigEntry.value);
          
          // Ensure device role is preserved
          if (!localStorage.getItem('device_role')) {
             localStorage.setItem('device_role', 'Owner');
          }

          alert("Shop Restored Successfully! The app will now reload.");
          
          // 4. Force App Brain Refresh
          window.location.reload();
        }
      } catch (err) {
        alert('Restore failed: ' + (err as Error).message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.gz')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const handlePushUpdateToStaff = async () => {
    setIsUpdatingInventory(true);
    try {
      const resetStock = confirm("Boss, do you want to RESET staff stock levels to match your phone? (Choose NO if you only want to update items and prices).");
      await pushInventoryUpdateToStaff(resetStock);
      alert("Inventory update shared successfully!");
    } catch (err) {
      alert("Failed to share update: " + (err as Error).message);
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const handleImportInventoryUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsUpdatingInventory(true);
        const jsonStr = event.target?.result as string;
        const data = JSON.parse(jsonStr);
        
        const result = await applyInventoryUpdate(data);
        alert(`Inventory Updated! ${result.added} new products added, ${result.updated} prices updated.`);
        window.location.reload();
      } catch (err) {
        alert('Update failed: ' + (err as Error).message);
      } finally {
        setIsUpdatingInventory(false);
        if (inventoryUpdateRef.current) inventoryUpdateRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handlePairPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      await connectBluetoothPrinter();
    } catch (err: any) {
      alert("Pairing failed: " + err.message);
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleUnpairPrinter = () => {
    disconnectPrinter();
    window.location.reload();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || newUser.pin.length !== 4) return;
    await db.users.add({ ...newUser });
    setNewUser({ name: '', pin: '', role: 'Staff' });
    setShowAddUser(false);
  };

  const handleDeleteUser = async (id: string | number) => {
    if (confirm("Delete this user account?")) {
      await db.users.delete(id);
    }
  };

  const handleApplyInflationProtection = async () => {
    const inventory = await db.inventory.toArray();
    const itemsToUpdate = bulkData.targetCategory === 'All' 
      ? inventory 
      : inventory.filter(i => i.category === bulkData.targetCategory);

    if (itemsToUpdate.length === 0) return alert("No items found.");
    
    if (confirm(`Update prices for ${itemsToUpdate.length} items? This cannot be undone.`)) {
      const updated = itemsToUpdate.map(item => {
        let current = bulkData.targetField === 'Selling Price' ? item.sellingPrice : item.costPrice;
        let newValue = bulkData.updateType === 'Percentage' ? current * (1 + bulkData.value / 100) : current + bulkData.value;
        newValue = Math.ceil(newValue / 50) * 50; 
        return { 
          ...item, 
          [bulkData.targetField === 'Selling Price' ? 'sellingPrice' : 'costPrice']: newValue 
        };
      });
      await db.inventory.bulkPut(updated);
      alert("Prices updated and rounded to nearest ₦50!");
      setShowBulkModal(false);
    }
  };

  const handleReconcileMerge = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsMerging(true);
        const result = event.target?.result;
        const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer));
        const staffData = JSON.parse(new TextDecoder().decode(decompressed));
        const report = await reconcileStaffSales(staffData, user.name || 'Admin');
        setReconcileResult({ merged: report.merged, skipped: report.skipped });
      } catch (err) {
        alert('Merge failed. Ensure file is a valid Staff Report.');
      } finally {
        setIsMerging(false);
        if (reconcileInputRef.current) reconcileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const faqItems = [
    { id: 'softpos', title: 'What is Soft POS?', content: 'Soft POS allows you to accept bank transfers as if you had a physical POS terminal. It displays your bank details to customers on a high-end screen and requires you to verify the credit alert before completing the sale.' },
    { id: 'staff', title: 'How to Setup Staff', content: '1. Add a Staff member in Settings. 2. Tap "Invite" (Share Icon) to get a code. 3. Send that code to your staff via WhatsApp. 4. They open the app on their phone, tap "Import Code / Sync", and paste the code.' },
    { id: 'offline', title: 'Daily Offline Use', content: 'Record all sales offline. At the end of the day, have your staff click "Send Report" in Sales History to send you a sync file via WhatsApp. Use "Merge Staff" here to sync their sales.' },
    { id: 'backup', title: 'Data Safety', content: 'Backup your shop daily. The backup file is saved to your phone\'s Downloads. We recommend emailing it to yourself or saving to Google Drive for 100% safety.' }
  ];

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <BackupSuccessModal isOpen={showBackupSuccess} onClose={() => setShowBackupSuccess(false)} fileName={backupFileName} />

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">{isAdmin ? 'Admin Control' : 'Staff Settings'}</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">{isAdmin ? 'Master Settings' : 'Personal Preferences'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-emerald-600 active:scale-90 transition-all">
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
          <button onClick={() => window.location.reload()} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-red-400 active:scale-90 transition-all">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      {/* App Install Helper */}
      <button 
        onClick={handleManualInstall}
        className="w-full flex items-center justify-between p-6 bg-emerald-600 text-white rounded-[32px] shadow-lg shadow-emerald-200 active:scale-95 transition-all"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="font-black text-base uppercase italic leading-none">Add to Home Screen</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Enable 100% Offline App Mode</p>
          </div>
        </div>
        <Download size={20} />
      </button>

      {/* Support & Resources - NEW */}
      <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-800 rounded-xl text-blue-600 dark:text-blue-300">
            <HelpCircle size={18} />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support & Resources</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={() => window.open('/help', '_blank')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-100 dark:border-emerald-800/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-emerald-500" />
              <span className="text-xs font-black text-slate-700 dark:text-emerald-50 uppercase italic">Online Help Center</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          <button 
            onClick={() => window.open('/affiliates', '_blank')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-100 dark:border-emerald-800/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <Gift size={18} className="text-amber-500" />
              <span className="text-xs font-black text-slate-700 dark:text-emerald-50 uppercase italic">Join Affiliate Program</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          <button 
            onClick={() => window.open('/about', '_blank')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-100 dark:border-emerald-800/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <Info size={18} className="text-blue-500" />
              <span className="text-xs font-black text-slate-700 dark:text-emerald-50 uppercase italic">About NaijaShop</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>
      </section>

      {/* Inventory Sync Section - NEW */}
      <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-300">
            <RefreshCw size={18} />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Sync</h2>
        </div>
        
        {isAdmin ? (
          <button 
            onClick={handlePushUpdateToStaff}
            disabled={isUpdatingInventory}
            className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
          >
            {isUpdatingInventory ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
            Push Inventory to Staff
          </button>
        ) : (
          <label className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              accept=".json" 
              onChange={handleImportInventoryUpdate}
              ref={inventoryUpdateRef}
            />
            {isUpdatingInventory ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>}
            Update from Boss
          </label>
        )}
        <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed px-4">
          {isAdmin 
            ? "Send updated products and prices to staff via WhatsApp." 
            : "Select the update file sent by the Boss to sync your inventory."}
        </p>
      </section>

      {/* Primary Actions */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => setPage(Page.CATEGORY_MANAGER)} className="w-full flex items-center justify-between p-6 bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/40 rounded-[32px] shadow-sm active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <Tag size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-slate-800 dark:text-emerald-50 text-base uppercase italic">Category Lab</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Shop Folders</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </button>
        </div>
      )}

      {/* Soft POS Setup */}
      {isAdmin && (
        <section className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl space-y-4 border border-emerald-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Soft POS Setup</h2>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Customer Bank Transfers</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Bank Name</label>
              <input className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. OPay / Access Bank" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Account Number</label>
              <input className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl font-mono font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g,''))} placeholder="0123456789" maxLength={10} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Account Name</label>
              <input className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. AL-BARAKAH VENTURES" />
            </div>
            <button onClick={saveBankDetails} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Save Bank Details</button>
            <div className="bg-white/5 p-3 rounded-2xl flex gap-2 items-center">
              <Info size={12} className="text-emerald-500 flex-shrink-0" />
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">These details will be shown to customers during Soft POS transfers.</p>
            </div>
          </div>
        </section>
      )}

      {/* Shop Branding Section */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-300">
              <Store size={18} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Branding</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase ml-2 flex items-center gap-1"><Store size={10}/> Business Name</label>
              <input 
                className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={shopName} 
                onChange={e => setShopName(e.target.value)} 
                placeholder="e.g. Al-Barakah Stores"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase ml-2 flex items-center gap-1"><MapPin size={10}/> Address & Phone</label>
              <input 
                className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={shopInfo} 
                onChange={e => setShopInfo(e.target.value)} 
                placeholder="e.g. 12 Market St, Lagos. 08012345678"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase ml-2 flex items-center gap-1"><Receipt size={10}/> Receipt Footer</label>
              <input 
                className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={receiptFooter} 
                onChange={e => setReceiptFooter(e.target.value)} 
                placeholder="e.g. No Refund After Payment"
              />
            </div>
          </div>
        </section>
      )}

      {/* Printer Configuration Section */}
      <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-300">
            <Printer size={18} />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bluetooth Printer</h2>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-emerald-950/40 rounded-[28px] border border-slate-100 dark:border-emerald-800 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isPrinterReady() ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-200 text-slate-400'}`}>
                <Bluetooth size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-emerald-50 truncate max-w-[120px]">{printerName || 'No Printer'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{isPrinterReady() ? 'Connected & Ready' : '58mm Thermal Offline'}</p>
              </div>
           </div>
           {isPrinterReady() ? (
             <button onClick={handleUnpairPrinter} className="text-red-400 font-black text-[10px] uppercase tracking-widest bg-white dark:bg-emerald-900 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900">Disconnect</button>
           ) : (
             <button onClick={handlePairPrinter} disabled={isConnectingPrinter} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50">
               {isConnectingPrinter ? 'Pairing...' : 'Pair Now'}
             </button>
           )}
        </div>
      </section>

      {/* Staff Management Section */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/40 rounded-xl text-purple-600 dark:text-purple-300">
                <Users size={18} />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Management</h2>
            </div>
            <button onClick={() => setShowAddUser(true)} className="p-2.5 bg-emerald-600 text-white rounded-xl active:scale-90 transition-all shadow-lg shadow-emerald-200"><Plus size={18}/></button>
          </div>
          <div className="space-y-3">
            {users?.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-100 dark:border-emerald-800/40">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.role === 'Admin' ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-emerald-50">{u.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.role} • <span className="font-mono tracking-tighter">PIN: {u.pin}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {u.role === 'Staff' && (
                    <button onClick={() => generateStaffInviteKey(u)} className="p-2 text-emerald-500 active:scale-90" title="Invite Code">
                      <Share2 size={16}/>
                    </button>
                  )}
                  {u.id !== user.id && (
                    <button onClick={() => handleDeleteUser(u.id!)} className="p-2 text-red-300 active:scale-90">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Management Section */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-300">
              <Database size={18} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Safety</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={handleBackup} 
              disabled={isBackingUp} 
              className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
            >
              {isBackingUp ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>} 
              {isBackingUp ? 'Saving Data...' : 'Full Shop Backup'}
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="flex-1 bg-white dark:bg-emerald-800 border border-slate-100 dark:border-emerald-700 p-5 rounded-[24px] flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all shadow-sm">
                <input type="file" className="hidden" accept=".json,.gz" onChange={handleImportJSON} ref={fileInputRef} />
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-emerald-900 flex items-center justify-center mb-2">
                  <Database className="text-slate-400" size={20}/>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Restore Backup</span>
              </label>
              <label className="flex-1 bg-white dark:bg-emerald-800 border border-slate-100 dark:border-emerald-700 p-5 rounded-[24px] flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all shadow-sm">
                <input type="file" className="hidden" accept=".gz" onChange={handleReconcileMerge} ref={reconcileInputRef} />
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900 flex items-center justify-center mb-2">
                  <RefreshCw className={`text-emerald-400 ${isMerging ? 'animate-spin' : ''}`} size={20}/>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Merge Staff Report</span>
              </label>
            </div>
            
            {reconcileResult && (
               <div className="bg-emerald-50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-between animate-in zoom-in duration-300">
                 <div className="flex items-center gap-2">
                   <CheckCircle2 size={16} className="text-emerald-500" />
                   <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">
                     Synced: {reconcileResult.merged} | Skipped: {reconcileResult.skipped}
                   </span>
                 </div>
                 <button onClick={() => setReconcileResult(null)} className="text-[9px] font-bold text-emerald-400">Clear</button>
               </div>
            )}

            <button 
              onClick={async () => { 
                if(confirm("FINAL WARNING: Delete ALL shop data? This cannot be recovered!")) { 
                  await clearAllData(); 
                  localStorage.clear();
                  window.location.reload(); 
                } 
              }} 
              className="w-full py-4 text-red-300 font-bold text-[9px] uppercase tracking-[0.4em] hover:text-red-500 transition-colors"
            >
              Wipe Terminal Data
            </button>
          </div>
        </section>
      )}

      {/* Accordion FAQ Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-2 mb-1">
          <HelpCircle size={14} className="text-slate-300" />
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Help & FAQ</h3>
        </div>
        {faqItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-emerald-900 border border-slate-50 dark:border-emerald-800 p-5 rounded-[28px] shadow-sm">
            <button 
              onClick={() => setActiveAccordion(activeAccordion === item.id ? null : item.id)} 
              className="w-full flex items-center justify-between group"
            >
               <span className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight group-active:text-emerald-600 transition-colors">{item.title}</span>
               <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 ${activeAccordion === item.id ? 'rotate-180' : ''}`} />
            </button>
            {activeAccordion === item.id && (
              <div className="mt-4 animate-in slide-in-from-top duration-300">
                <p className="text-xs font-medium text-slate-500 dark:text-emerald-400 leading-relaxed bg-slate-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-slate-100 dark:border-emerald-800">
                  {item.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="py-6 text-center space-y-1">
        <p className="text-[9px] font-black text-slate-300 dark:text-emerald-900 uppercase tracking-[0.5em]">NaijaShop Offline POS • v2.5</p>
        <p className="text-[8px] font-bold text-slate-400 dark:text-emerald-800/40 uppercase tracking-widest">App Version: 1.0.5</p>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[48px] p-8 shadow-2xl border dark:border-emerald-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><Users size={20}/></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 italic">New Account</h2>
              </div>
              <button onClick={() => setShowAddUser(false)} className="p-2 bg-slate-50 dark:bg-emerald-800 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                <input 
                  required 
                  className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none focus:ring-4 focus:ring-emerald-500/10" 
                  value={newUser.name} 
                  onChange={e => setNewUser({...newUser, name: e.target.value})} 
                  placeholder="e.g. Musa Ibrahim"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">4-Digit PIN</label>
                <input 
                  required 
                  type="password" 
                  maxLength={4} 
                  inputMode="numeric" 
                  className="w-full p-4 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-black text-2xl tracking-[0.8em] text-center dark:text-emerald-50 outline-none focus:ring-4 focus:ring-emerald-500/10" 
                  value={newUser.pin} 
                  onChange={e => setNewUser({...newUser, pin: e.target.value.replace(/\D/g,'')})} 
                />
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 flex items-center gap-3">
                 <ShieldAlert size={18} className="text-emerald-500" />
                 <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase leading-relaxed">Admin power is given only on your primary phone terminal.</p>
              </div>
              <button className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-100 dark:shadow-none uppercase tracking-widest text-xs active:scale-[0.98] transition-all">Create Account</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
