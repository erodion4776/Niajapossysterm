
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User as DBUser } from '../db.ts';
import pako from 'pako';
import { 
  backupToWhatsApp, 
  generateStaffInviteKey, 
  pushInventoryUpdateToStaff,
  reconcileStaffSales,
  restoreFullBackup,
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
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });

  const reconcileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
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
    localStorage.setItem('shop_name', shopName);
    localStorage.setItem('shop_info', shopAddress);
    alert("Shop Identity Updated!");
  };

  const saveBankDetails = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      alert("Please fill all bank fields!");
      return;
    }
    await db.settings.put({ key: 'softPosBank', value: bankName.trim() });
    await db.settings.put({ key: 'softPosNumber', value: accountNumber.trim() });
    await db.settings.put({ key: 'softPosAccount', value: accountName.trim() });
    alert("Soft POS Configuration Saved!");
  };

  const handleManualUpdate = async () => {
    if (!navigator.onLine) {
      alert("Internet required to check for updates.");
      return;
    }
    setIsCheckingUpdates(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        if (registration.waiting) {
          if (confirm("New features found! Restart now?")) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        } else {
          alert("App is already up to date! (V1.1.4)");
        }
      }
    } catch (err) {
      alert("Update check failed.");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      alert("Installer not ready. Try Chrome menu > Install App.");
    }
  };

  const navigateToPublic = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('popstate'));
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // CAPTURING 100% OF DATA (Every table in db.ts)
      const data = {
        inventory: await db.inventory.toArray(),
        sales: await db.sales.toArray(),
        expenses: await db.expenses.toArray(),
        debts: await db.debts.toArray(),
        users: await db.users.toArray(),
        categories: await db.categories.toArray(),
        settings: await db.settings.toArray(),
        security: await db.security.toArray(),
        customers: await db.customers.toArray(), // Wallets
        stock_logs: await db.stock_logs.toArray(), // Audit trail
        parked_orders: await db.parked_orders.toArray(),
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

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ DANGER: This will delete all current data and replace it with the backup file. Proceed?")) {
      if (restoreInputRef.current) restoreInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("File is empty.");
        
        let jsonData;
        if (file.name.endsWith('.gz')) {
          const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer), { to: 'string' });
          jsonData = JSON.parse(decompressed);
        } else {
          jsonData = JSON.parse(new TextDecoder().decode(result as ArrayBuffer));
        }

        const restoreResult = await restoreFullBackup(jsonData);
        alert(`✅ Restore Successful! Welcome back to ${restoreResult.shopName}. The app will now reload.`);
        window.location.reload();
      } catch (err) {
        alert("Restore failed: " + (err as Error).message);
      } finally {
        setIsRestoring(false);
        if (restoreInputRef.current) restoreInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
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
        const report = await reconcileStaffSales(jsonData, user.name || 'Boss');
        alert(`Merged: ${report.merged} Sales, ${report.debtsAdded} Debts.`);
      } catch (err) {
        alert("Import failed.");
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
      await pushInventoryUpdateToStaff(confirm("Force staff stock levels to match yours?"));
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      alert("Sync pushed!");
    } catch (err) {
      alert("Push failed.");
    } finally {
      setIsUpdatingInventory(false);
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
    if (!editingUser) return;
    await db.users.update(editingUser.id!, { name: editingUser.name, pin: editingUser.pin });
    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string | number) => {
    if (!confirm("Delete staff member?")) return;
    await db.users.delete(id);
  };

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in duration-500 overflow-y-auto max-h-screen custom-scrollbar">
      <BackupSuccessModal isOpen={showBackupSuccess} onClose={() => setShowBackupSuccess(false)} fileName={backupFileName} />

      <header className="flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-emerald-950 py-2 z-10">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight italic">Admin</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Master Control</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="p-3 bg-white dark:bg-emerald-900 border rounded-2xl shadow-sm text-emerald-600">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => { localStorage.removeItem('user_role'); window.location.reload(); }} className="p-3 bg-white dark:bg-emerald-900 border rounded-2xl shadow-sm text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><Store size={18} /></div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Profile</h2>
          </div>
          <div className="space-y-4">
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner Name" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" />
            <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Shop Name" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" />
            <button onClick={saveShopProfile} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 shadow-lg">Save Branding</button>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600"><Landmark size={18} /></div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Soft POS Setup</h2>
          </div>
          <div className="space-y-4">
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" />
            <input type="number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" />
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account Name" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl font-bold dark:text-emerald-50 outline-none" />
            <button onClick={saveBankDetails} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 shadow-lg">Activate Soft POS</button>
          </div>
        </section>
      )}

      {/* QUICK TOOLS */}
      <section className="grid grid-cols-2 gap-3">
           <button onClick={() => setPage(Page.SALES)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-800 rounded-2xl text-emerald-600"><History size={24}/></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">History</span>
           </button>
           <button onClick={() => setPage(Page.CUSTOMERS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-2xl text-blue-600"><Wallet size={24}/></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Wallets</span>
           </button>
      </section>

      {/* RECONCILIATION */}
      {isAdmin && (
        <section className="bg-emerald-950 p-7 rounded-[40px] shadow-2xl relative border-2 border-emerald-500/20 space-y-6">
             <h2 className="text-xl font-black text-emerald-400 italic uppercase">RECONCILIATION</h2>
             <div className="grid grid-cols-1 gap-3">
                <label className="w-full bg-white text-emerald-950 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all cursor-pointer shadow-lg">
                   <input type="file" ref={reconcileInputRef} className="hidden" accept=".json,.gz" onChange={handleImportStaffSales} />
                   {isReconciling ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 1. IMPORT STAFF SALES
                </label>
                <button onClick={handlePushUpdateToStaff} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 shadow-xl">
                   {isUpdatingInventory ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 2. SEND MASTER TO STAFF
                </button>
             </div>
        </section>
      )}

      {/* CATEGORY LAB */}
      {isAdmin && (
        <section onClick={() => setPage(Page.CATEGORY_MANAGER)} className="bg-emerald-950 p-7 rounded-[40px] shadow-2xl relative border-2 border-emerald-400/30 cursor-pointer active:scale-[0.98]">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <h2 className="text-2xl font-black text-emerald-400 italic uppercase">CATEGORY LAB</h2>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">MANAGE SHOP FOLDERS</p>
                </div>
                <div className="p-4 bg-emerald-400/10 rounded-3xl text-emerald-400 border border-emerald-400/20"><LayoutGrid size={32} /></div>
             </div>
        </section>
      )}

      {/* UPDATE CARD */}
      <section className="bg-emerald-950 p-6 rounded-[32px] border border-emerald-800/40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400"><Zap size={18} /></div>
          <div>
            <h2 className="text-xs font-black text-white uppercase italic">Software Update</h2>
            <p className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">V1.1.4</p>
          </div>
        </div>
        <button onClick={handleManualUpdate} disabled={isCheckingUpdates} className="w-full bg-transparent border-2 border-emerald-500/30 text-emerald-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">
          {isCheckingUpdates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Check Updates
        </button>
      </section>

      {/* SUPPORT & RESOURCES */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2"><h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support & Resources</h2></div>
        <div className="bg-emerald-900/20 rounded-[32px] border border-emerald-800/20 p-2">
           <button onClick={() => navigateToPublic('/help')} className="w-full flex items-center justify-between p-5"><div className="flex items-center gap-4"><Globe size={20} className="text-emerald-500"/><span className="text-xs font-black uppercase text-slate-800 dark:text-emerald-50 italic">Help Center</span></div><ChevronRight size={18}/></button>
           <button onClick={() => navigateToPublic('/affiliates')} className="w-full flex items-center justify-between p-5"><div className="flex items-center gap-4"><Gift size={20} className="text-amber-500"/><span className="text-xs font-black uppercase text-slate-800 dark:text-emerald-50 italic">Join Affiliates</span></div><ChevronRight size={18}/></button>
           <button onClick={() => navigateToPublic('/about')} className="w-full flex items-center justify-between p-5"><div className="flex items-center gap-4"><Info size={20} className="text-blue-500"/><span className="text-xs font-black uppercase text-slate-800 dark:text-emerald-50 italic">About Us</span></div><ChevronRight size={18}/></button>
        </div>
      </section>

      {/* DATA & SYNC - COMPREHENSIVE BACKUP & RESTORE */}
      {isAdmin && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2"><h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Vault</h2></div>
          <div className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-3">
               <button onClick={handleBackup} disabled={isBackingUp} className="w-full bg-slate-900 dark:bg-emerald-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] active:scale-95 shadow-lg">
                 {isBackingUp ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>} Full Export to Phone
               </button>
               
               <label className="w-full bg-white dark:bg-emerald-950 border-2 border-red-100 dark:border-red-900/40 text-red-500 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] cursor-pointer active:scale-95">
                  <input type="file" ref={restoreInputRef} className="hidden" accept=".json,.gz" onChange={handleRestoreFile} />
                  {isRestoring ? <Loader2 size={18} className="animate-spin"/> : <Database size={18}/>} ⚠️ Restore Master Backup
               </label>
            </div>
            <p className="text-[8px] font-bold text-slate-400 uppercase text-center px-4 leading-relaxed italic">
              Restore wipes local data and replaces it with the backup file. Use only during phone change or emergencies.
            </p>
          </div>
        </section>
      )}

      {/* STAFF LIST */}
      {isAdmin && (
        <section className="bg-white dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
            <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-emerald-100">Staff Members</span><button onClick={() => setShowAddUser(true)} className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><Plus size={16}/></button></div>
            <div className="space-y-3">
              {users?.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl">
                  <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{u.role === 'Admin' ? <ShieldCheck size={18} /> : <UserIcon size={18} />}</div><div><p className="text-sm font-black text-slate-800 dark:text-emerald-50">{u.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{u.role}</p></div></div>
                  <div className="flex gap-1">
                    {u.role === 'Staff' && (<><button onClick={() => setEditingUser(u)} className="p-2 text-slate-400"><Edit3 size={16}/></button><button onClick={() => generateStaffInviteKey(u)} className="p-2 text-emerald-500"><Share2 size={16}/></button><button onClick={() => u.id && handleDeleteUser(u.id)} className="p-2 text-red-300"><Trash2 size={16}/></button></>)}
                  </div>
                </div>
              ))}
            </div>
        </section>
      )}

      {/* Staff Modals */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-8 shadow-2xl">
             <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase italic">New Staff</h2><button onClick={() => setShowAddUser(false)}><X size={20}/></button></div>
             <form onSubmit={handleAddUser} className="space-y-4">
                <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold dark:text-white outline-none" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <input required type="password" maxLength={4} pattern="\d{4}" placeholder="4-Digit PIN" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold text-center text-xl dark:text-white outline-none" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">Save Staff</button>
             </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[40px] p-8 shadow-2xl">
             <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase italic">Edit Staff</h2><button onClick={() => setEditingUser(null)}><X size={20}/></button></div>
             <form onSubmit={handleEditUser} className="space-y-4">
                <input required type="text" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold dark:text-white outline-none" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                <input required type="password" maxLength={4} className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold text-center text-xl dark:text-white outline-none" value={editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} />
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">Update Profile</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
