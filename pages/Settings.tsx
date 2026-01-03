
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
import { forceUpdateCheck } from '../utils/updateManager.ts';
import pako from 'pako';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, HelpCircle, ChevronDown, BookOpen, Loader2, CheckCircle2,
  Moon, Sun, Key, Users, X, Send, Printer, Bluetooth, ShieldAlert, Wifi, TrendingUp, AlertCircle, 
  ChevronRight, MapPin, Phone, Receipt, Info, LogOut, Landmark, CreditCard, Tag, Download, Globe, Gift,
  Zap, History, FileText, Wallet
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
  
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || 'NaijaShop');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || 'Address, City, Phone');
  const [receiptFooter, setReceiptFooter] = useState(() => localStorage.getItem('receipt_footer') || 'Thank you for your patronage!');

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const [showAddUser, setShowAddUser] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'latest'>('idle');
  
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });

  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [reconcileResult, setReconcileResult] = useState<{merged: number, skipped: number, debtsAdded: number, walletsSynced: number} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconcileInputRef = useRef<HTMLInputElement>(null);
  const inventoryUpdateRef = useRef<HTMLInputElement>(null);

  const users = useLiveQuery(() => db.users.toArray());
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

  const handleForceUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const updated = await forceUpdateCheck();
      if (!updated) {
        setUpdateStatus('latest');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch (err: any) {
      alert(err.message || "Update check failed.");
    } finally {
      setIsCheckingUpdate(false);
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
        security: await db.security.toArray(), 
        shopName, shopInfo, timestamp: Date.now() 
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

  const handlePushUpdateToStaff = async () => {
    setIsUpdatingInventory(true);
    try {
      const resetStock = confirm("Boss, do you want to RESET staff stock levels to match your phone? (Choose NO if you only want to update items and prices).");
      await pushInventoryUpdateToStaff(resetStock);
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      alert("Inventory update shared successfully!");
    } catch (err) {
      alert("Failed to share update: " + (err as Error).message);
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const handlePairPrinter = async () => {
    setIsConnectingPrinter(true);
    try { await connectBluetoothPrinter(); } 
    catch (err: any) { alert("Pairing failed: " + err.message); } 
    finally { setIsConnectingPrinter(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || newUser.pin.length !== 4) return;
    await db.users.add({ ...newUser });
    setNewUser({ name: '', pin: '', role: 'Staff' });
    setShowAddUser(false);
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <BackupSuccessModal isOpen={showBackupSuccess} onClose={() => setShowBackupSuccess(false)} fileName={backupFileName} />

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Admin</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Master Settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-emerald-600 active:scale-90 transition-all">
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
          <button onClick={() => { localStorage.removeItem('user_role'); window.location.reload(); }} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-red-400 active:scale-90 transition-all">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      {/* HIDDEN PAGES SHORTCUTS */}
      <section className="grid grid-cols-2 gap-3">
         <button onClick={() => setPage(Page.SALES)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
            <History className="text-emerald-600" size={20}/>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Sales History</span>
         </button>
         <button onClick={() => setPage(Page.CUSTOMERS)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
            <Wallet className="text-blue-600" size={20}/>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Wallets</span>
         </button>
         <button onClick={() => setPage(Page.STOCK_LOGS)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
            <FileText className="text-amber-600" size={20}/>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Stock Logs</span>
         </button>
         <button onClick={() => setPage(Page.EXPENSES)} className="bg-white dark:bg-emerald-900/40 p-4 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
            <Receipt className="text-purple-600" size={20}/>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Expenses</span>
         </button>
      </section>

      {/* Inventory Sync Card */}
      <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><RefreshCw size={18} /></div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Sync</h2>
        </div>
        {isAdmin ? (
          <button onClick={handlePushUpdateToStaff} disabled={isUpdatingInventory} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
            {isUpdatingInventory ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Push Update to Staff
          </button>
        ) : (
          <label className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all cursor-pointer">
            <input type="file" className="hidden" accept=".json" onChange={(e) => {}} />
            <CloudUpload size={18}/> Update from Boss
          </label>
        )}
      </section>

      {/* Bluetooth Printer */}
      <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600"><Printer size={18} /></div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bluetooth Printer</h2>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-emerald-950/40 rounded-[28px] border border-slate-100 dark:border-emerald-800 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isPrinterReady() ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-200 text-slate-400'}`}><Bluetooth size={20} /></div>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-emerald-50 truncate max-w-[120px]">{printerName || 'No Printer'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{isPrinterReady() ? 'Connected' : 'Offline'}</p>
              </div>
           </div>
           {!isPrinterReady() && <button onClick={handlePairPrinter} disabled={isConnectingPrinter} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Pair</button>}
        </div>
      </section>

      {/* Branding and Users */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-4">
           <button onClick={() => setPage(Page.CATEGORY_MANAGER)} className="w-full flex items-center justify-between p-6 bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/40 rounded-[32px] shadow-sm active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-800 text-emerald-600 rounded-2xl"><Tag size={24} /></div>
                <div className="text-left">
                  <h3 className="font-black text-slate-800 dark:text-emerald-50 text-base uppercase italic leading-none">Category Lab</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Shop Folders</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
           </button>
        </div>
      )}

      {/* Staff Management */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Control</h2>
            <button onClick={() => setShowAddUser(true)} className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200"><Plus size={18}/></button>
          </div>
          <div className="space-y-3">
            {users?.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.role === 'Admin' ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div><p className="text-sm font-black text-slate-800 dark:text-emerald-50">{u.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{u.role}</p></div>
                </div>
                {u.role === 'Staff' && <button onClick={() => generateStaffInviteKey(u)} className="p-2 text-emerald-500"><Share2 size={16}/></button>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Safety */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-6">
          <div className="flex items-center gap-3"><Database size={18} className="text-emerald-600"/><h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Safety</h2></div>
          <button onClick={handleBackup} disabled={isBackingUp} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[10px] shadow-xl active:scale-95">
            {isBackingUp ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>} Full Shop Backup
          </button>
        </section>
      )}
    </div>
  );
};

export default Settings;
