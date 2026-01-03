
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User as DBUser } from '../db.ts';
import pako from 'pako';
import { 
  backupToWhatsApp, 
  generateStaffInviteKey, 
  pushInventoryUpdateToStaff,
  reconcileStaffSales,
  formatNaira
} from '../utils/whatsapp.ts';
import { 
  CloudUpload, User as UserIcon, Store, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, Loader2,
  Moon, Sun, X, Send, Landmark, Save,
  History, FileText, Wallet, Receipt, LogOut, Tag,
  CreditCard, CheckCircle2, Download, Package, Users, Zap,
  Smartphone, HelpCircle, MessageCircle, ChevronRight, Globe, MapPin, Phone, Edit3, Gift, Info,
  LayoutGrid, FolderTree
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';
import { useTheme } from '../ThemeContext.tsx';

interface SettingsProps {
  user: DBUser;
  role: Role;
  setRole: (role: Role) => void;
  setPage: (page: Page) => void;
  deferredPrompt: any;
}

export const Settings: React.FC<SettingsProps> = ({ user, role, setRole, setPage, deferredPrompt }) => {
  const isAdmin = role === 'Admin';
  const { theme, toggleTheme } = useTheme();
  
  // Section 1: Shop Profile
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState(() => localStorage.getItem('receipt_footer') || 'Thank you for your patronage!');

  // Section 2: Soft POS
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // UI States
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });

  const reconcileInputRef = useRef<HTMLInputElement>(null);
  const users = useLiveQuery(() => db.users.toArray());

  useEffect(() => {
    const loadSettings = async () => {
      const on = await db.settings.get('owner_name');
      const sn = await db.settings.get('shop_name');
      const sa = await db.settings.get('shop_address');
      const sp = await db.settings.get('shop_phone');
      const bn = await db.settings.get('softPosBank');
      const an = await db.settings.get('softPosNumber');
      const anm = await db.settings.get('softPosAccount');

      if (on) setOwnerName(on.value);
      if (sn) setShopName(sn.value);
      if (sa) setShopAddress(sa.value);
      if (sp) setShopPhone(sp.value);
      if (bn) setBankName(bn.value);
      if (an) setAccountNumber(an.value);
      if (anm) setAccountName(anm.value);
    };
    loadSettings();
  }, []);

  const saveShopProfile = async () => {
    await db.settings.bulkPut([
      { key: 'owner_name', value: ownerName },
      { key: 'shop_name', value: shopName },
      { key: 'shop_address', value: shopAddress },
      { key: 'shop_phone', value: shopPhone }
    ]);
    
    // Update legacy storage
    localStorage.setItem('shop_name', shopName);
    localStorage.setItem('shop_info', shopAddress);
    localStorage.setItem('receipt_footer', receiptFooter);
    
    alert("Shop Branding & Identity Updated!");
  };

  const saveBankDetails = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      alert("Please fill all bank fields to activate Soft POS!");
      return;
    }
    await db.settings.put({ key: 'softPosBank', value: bankName.trim() });
    await db.settings.put({ key: 'softPosNumber', value: accountNumber.trim() });
    await db.settings.put({ key: 'softPosAccount', value: accountName.trim() });
    alert("Soft POS Configuration Saved!");
  };

  const handleManualUpdate = async () => {
    if (!navigator.onLine) {
      alert("Oga, you need internet to check for updates!");
      return;
    }
    setIsCheckingUpdates(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        await new Promise(r => setTimeout(r, 1500));
        
        if (registration.waiting) {
          if (confirm("New features found! Restart app to update?")) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        } else {
          alert("Oga, your app is already up to date with the latest features! (V1.1.4)");
        }
      } else {
        alert("Could not find update channel. Try refreshing the page manually.");
      }
    } catch (err) {
      alert("Update check failed. Please check your connection.");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`✅ PWA: User response to install: ${outcome}`);
    } else {
      alert("Oga, your browser is not ready yet. Please wait 10 seconds or click the 3 dots in Chrome and select 'Install App' manually.");
    }
  };

  const navigateToPublic = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('popstate'));
  };

  const handleImportStaffSales = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReconciling(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("File empty");
        
        let jsonData;
        if (file.name.endsWith('.gz')) {
          const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer), { to: 'string' });
          jsonData = JSON.parse(decompressed);
        } else {
          jsonData = JSON.parse(new TextDecoder().decode(result as ArrayBuffer));
        }

        if (jsonData.type !== 'STAFF_REPORT') {
          throw new Error("Invalid report file. Must be a staff sales report.");
        }

        const report = await reconcileStaffSales(jsonData, user.name || 'Boss');
        alert(`Reconciliation Complete!\nMerged: ${report.merged} Sales\nAdded: ${report.debtsAdded} Debts\nSynced: ${report.walletsSynced} Wallets`);
      } catch (err) {
        alert("Import failed: " + (err as Error).message);
      } finally {
        setIsReconciling(false);
        if (reconcileInputRef.current) reconcileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePushUpdateToStaff = async () => {
    setIsUpdatingInventory(true);
    try {
      const resetStock = confirm("Do you want to force staff stock levels to match yours exactly?\n\nSelect NO to only update prices and item names.");
      await pushInventoryUpdateToStaff(resetStock);
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      alert("Inventory and Staff profiles shared successfully!");
    } catch (err) {
      alert("Push failed: " + (err as Error).message);
    } finally {
      setIsUpdatingInventory(false);
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
        shopName, ownerName, timestamp: Date.now() 
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || newUser.pin.length !== 4) return;
    await db.users.add({ ...newUser });
    setNewUser({ name: '', pin: '', role: 'Staff' });
    setShowAddUser(false);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name || editingUser.pin.length !== 4) return;
    await db.users.update(editingUser.id!, { 
      name: editingUser.name,
      pin: editingUser.pin
    });
    alert("Staff profile updated locally. Push to Staff to sync!");
    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string | number) => {
    if (!confirm("Remove this staff member? They will lose access after your next Push update.")) return;
    await db.users.delete(id);
  };

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in duration-500 overflow-y-auto max-h-screen custom-scrollbar">
      <BackupSuccessModal isOpen={showBackupSuccess} onClose={() => setShowBackupSuccess(false)} fileName={backupFileName} />

      <header className="flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-emerald-950 py-2 z-10 transition-colors">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic">Admin</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Shop Master Control</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-emerald-600 active:scale-90 transition-all">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => { localStorage.removeItem('user_role'); window.location.reload(); }} className="p-3 bg-white dark:bg-emerald-900 border border-slate-100 dark:border-emerald-800 rounded-2xl shadow-sm text-red-400 active:scale-90 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* SECTION 1: SHOP PROFILE */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><Store size={18} /></div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Profile</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><UserIcon size={8}/> Owner Name</label>
              <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Store size={8}/> Business Name</label>
              <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><MapPin size={8}/> Shop Address</label>
              <input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="e.g. Shop 24, Main Market" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Phone size={8}/> Support Phone</label>
              <input type="text" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Receipt Footer</label>
              <input type="text" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button onClick={saveShopProfile} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100">
              <Save size={16}/> Save Branding
            </button>
          </div>
        </section>
      )}

      {/* SECTION 2: SOFT POS SETUP */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600"><Landmark size={18} /></div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Soft POS Setup</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Bank Name</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. OPay / GTBank" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Account Number</label>
              <input type="number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter 10 digits" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Account Name</label>
              <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As seen in bank app" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={saveBankDetails} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-100">
              <ShieldCheck size={16}/> Activate Soft POS
            </button>
          </div>
        </section>
      )}

      {/* SECTION 3: QUICK TOOLS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Tools</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
           <button onClick={() => setPage(Page.SALES)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-800 rounded-2xl text-emerald-600"><History size={24}/></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">History</span>
           </button>
           <button onClick={() => setPage(Page.CUSTOMERS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-2xl text-blue-600"><Wallet size={24}/></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Wallets</span>
           </button>
           <button onClick={() => setPage(Page.STOCK_LOGS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-2xl text-amber-600"><FileText size={24}/></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Stock Logs</span>
           </button>
           <button onClick={() => setPage(Page.EXPENSES)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/40 rounded-2xl text-purple-600"><Receipt size={24}/></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Expenses</span>
           </button>
        </div>
      </section>

      {/* DAILY RECONCILIATION */}
      {isAdmin && (
        <section className="bg-emerald-950 p-7 rounded-[40px] shadow-2xl relative overflow-hidden border-2 border-emerald-500/20 space-y-6">
          <div className="relative z-10 flex flex-col gap-1">
             <h2 className="text-xl font-black text-emerald-400 italic uppercase tracking-tighter">DAILY RECONCILIATION</h2>
             <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Link your staff devices to your ledger</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3 relative z-10">
             <label className="w-full bg-white text-emerald-950 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all cursor-pointer shadow-lg">
                <input type="file" ref={reconcileInputRef} className="hidden" accept=".json,.gz" onChange={handleImportStaffSales} />
                {isReconciling ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 1. IMPORT STAFF SALES
             </label>
             
             <button onClick={handlePushUpdateToStaff} disabled={isUpdatingInventory} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-xl">
                {isUpdatingInventory ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 2. SEND MASTER STOCK TO STAFF
             </button>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none"><RefreshCw size={120} /></div>
        </section>
      )}

      {/* CATEGORY LAB - NEW HIGH END BUTTON */}
      {isAdmin && (
        <section 
          onClick={() => setPage(Page.CATEGORY_MANAGER)}
          className="bg-emerald-950 p-7 rounded-[40px] shadow-2xl relative overflow-hidden border-2 border-emerald-400/30 space-y-2 cursor-pointer active:scale-[0.98] transition-all group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
             <div className="space-y-1">
                <h2 className="text-2xl font-black text-emerald-400 italic uppercase tracking-tighter">CATEGORY LAB</h2>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">MANAGE SHOP FOLDERS</p>
             </div>
             <div className="p-4 bg-emerald-400/10 rounded-3xl text-emerald-400 border border-emerald-400/20 group-hover:scale-110 transition-transform">
                <LayoutGrid size={32} />
             </div>
          </div>
          <div className="absolute -bottom-8 -left-8 opacity-[0.03] text-white pointer-events-none group-hover:rotate-12 transition-transform duration-700">
             <FolderTree size={160} />
          </div>
        </section>
      )}

      {/* ADD TO HOME SCREEN PROMPT */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-50 dark:border-emerald-800/40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600"><Smartphone size={24}/></div>
           <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Offline App Mode</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Install on home screen for faster sales</p>
           </div>
        </div>
        <button onClick={handleInstallClick} className="p-3 bg-blue-600 text-white rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-200">
           <ChevronRight size={20} />
        </button>
      </section>

      {/* SOFTWARE UPDATE CARD */}
      <section className="bg-emerald-950 p-6 rounded-[32px] border border-emerald-800/40 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-white pointer-events-none"><Zap size={80} /></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400"><Zap size={18} /></div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-tight italic">Software Update</h2>
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Current Version: V1.1.4</p>
          </div>
        </div>
        <button 
          onClick={handleManualUpdate}
          disabled={isCheckingUpdates}
          className="w-full bg-transparent border-2 border-emerald-500/30 text-emerald-400 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all relative z-10 disabled:opacity-50"
        >
          {isCheckingUpdates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {isCheckingUpdates ? 'Checking for updates...' : 'Check for New Features'}
        </button>
      </section>

      {/* SUPPORT & RESOURCES SECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <HelpCircle size={14} className="text-slate-400" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support & Resources</h2>
        </div>
        <div className="bg-emerald-900/20 rounded-[32px] border border-emerald-800/20 p-2 space-y-1">
           <button 
             onClick={() => navigateToPublic('/help')}
             className="w-full flex items-center justify-between p-5 hover:bg-white/5 active:scale-[0.98] transition-all rounded-[24px]"
           >
              <div className="flex items-center gap-4">
                 <div className="text-emerald-500"><Globe size={20}/></div>
                 <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-emerald-50 italic">Online Help Center</span>
              </div>
              <ChevronRight size={18} className="text-slate-400 dark:text-emerald-800" />
           </button>

           <button 
             onClick={() => navigateToPublic('/affiliates')}
             className="w-full flex items-center justify-between p-5 hover:bg-white/5 active:scale-[0.98] transition-all rounded-[24px]"
           >
              <div className="flex items-center gap-4">
                 <div className="text-amber-500"><Gift size={20}/></div>
                 <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-emerald-50 italic">Join Affiliate Program</span>
              </div>
              <ChevronRight size={18} className="text-slate-400 dark:text-emerald-800" />
           </button>

           <button 
             onClick={() => navigateToPublic('/about')}
             className="w-full flex items-center justify-between p-5 hover:bg-white/5 active:scale-[0.98] transition-all rounded-[24px]"
           >
              <div className="flex items-center gap-4">
                 <div className="text-blue-500"><Info size={20}/></div>
                 <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-emerald-50 italic">About NaijaShop</span>
              </div>
              <ChevronRight size={18} className="text-slate-400 dark:text-emerald-800" />
           </button>
        </div>
      </section>

      {/* SECTION 4: DATA & SYNC */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data & Sync</h2>
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Database size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-emerald-100">Business Backup</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
               <button onClick={handleBackup} disabled={isBackingUp} className="w-full bg-slate-900 dark:bg-emerald-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] active:scale-95 shadow-lg">
                 {isBackingUp ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>} Full Export to Phone
               </button>
               <label className="w-full bg-white dark:bg-emerald-950 border-2 border-emerald-100 dark:border-emerald-800 text-emerald-600 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] cursor-pointer active:scale-95">
                  <input type="file" className="hidden" accept=".json,.gz" onChange={() => {}} />
                  <Database size={18}/> Restore Master Backup
               </label>
            </div>
          </div>
        )}

        {/* Staff Members List */}
        {isAdmin && (
          <div className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-emerald-100">Staff Members</span>
              </div>
              <button onClick={() => setShowAddUser(true)} className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600 active:scale-90 transition-all"><Plus size={16}/></button>
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
                  <div className="flex gap-1">
                    {u.role === 'Staff' && (
                      <>
                        <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-emerald-500 active:scale-90 transition-all"><Edit3 size={16}/></button>
                        <button onClick={() => generateStaffInviteKey(u)} className="p-2 text-emerald-500 active:scale-90 transition-all"><Share2 size={16}/></button>
                        <button onClick={() => u.id && handleDeleteUser(u.id)} className="p-2 text-red-300 hover:text-red-500 active:scale-90 transition-all"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Staff Add Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase italic tracking-tight">New Staff</h2>
                <button onClick={() => setShowAddUser(false)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddUser} className="space-y-4">
                <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <input required type="password" maxLength={4} pattern="\d{4}" placeholder="4-Digit PIN" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold text-center text-xl tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">Save Staff Account</button>
             </form>
          </div>
        </div>
      )}

      {/* Staff Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase italic tracking-tight">Edit Staff</h2>
                <button onClick={() => setEditingUser(null)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20}/></button>
             </div>
             <form onSubmit={handleEditUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Name</label>
                  <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">New 4-Digit PIN</label>
                  <input required type="password" maxLength={4} pattern="\d{4}" placeholder="****" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold text-center text-xl tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white" value={editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">Update Profile</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
