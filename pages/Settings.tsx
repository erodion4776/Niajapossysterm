
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User as DBUser } from '../db.ts';
import { 
  backupToWhatsApp, 
  generateStaffInviteKey, 
  pushInventoryUpdateToStaff,
  formatNaira
} from '../utils/whatsapp.ts';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, ChevronRight, Loader2,
  Moon, Sun, Key, Users, X, Send, Printer, Bluetooth, ShieldAlert,
  History, FileText, Wallet, Receipt, LogOut, Landmark, Tag, Save,
  MapPin, Phone, Info, Globe, CreditCard
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';
import { useTheme } from '../ThemeContext.tsx';
import { connectBluetoothPrinter, isPrinterReady } from '../utils/bluetoothPrinter.ts';

interface SettingsProps {
  user: DBUser;
  role: Role;
  setRole: (role: Role) => void;
  setPage: (page: Page) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, role, setRole, setPage }) => {
  const isAdmin = role === 'Admin';
  const { theme, toggleTheme } = useTheme();
  
  // SECTION 1: Shop Profile State
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || 'NaijaShop');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || '');
  const [receiptFooter, setReceiptFooter] = useState(() => localStorage.getItem('receipt_footer') || 'Thank you for your patronage!');

  // SECTION 2: Soft POS State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // UI States
  const [showAddUser, setShowAddUser] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });

  const users = useLiveQuery(() => db.users.toArray());

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

  const saveShopProfile = () => {
    localStorage.setItem('shop_name', shopName);
    localStorage.setItem('shop_info', shopInfo);
    localStorage.setItem('receipt_footer', receiptFooter);
    alert("Shop Branding Updated!");
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
      const resetStock = confirm("Do you want to force staff stock levels to match yours exactly? (Select NO to only update prices and items).");
      await pushInventoryUpdateToStaff(resetStock);
      localStorage.setItem('last_inventory_sync', Date.now().toString());
      alert("Inventory update shared successfully!");
    } catch (err) {
      alert("Push failed: " + (err as Error).message);
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

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in duration-500 overflow-y-auto max-h-screen custom-scrollbar">
      <BackupSuccessModal isOpen={showBackupSuccess} onClose={() => setShowBackupSuccess(false)} fileName={backupFileName} />

      <header className="flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-emerald-950 py-2 z-10 transition-colors">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Admin</h1>
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
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Business Name</label>
              <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Physical Address / Info</label>
              <input type="text" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)} placeholder="e.g. Shop 24, Main Market" className="w-full p-3.5 bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl text-sm font-bold dark:text-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500" />
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
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Sales History</span>
           </button>
           <button onClick={() => setPage(Page.CUSTOMERS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-2xl text-blue-600"><Wallet size={24}/></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Wallets</span>
           </button>
           <button onClick={() => setPage(Page.STOCK_LOGS)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-2xl text-amber-600"><FileText size={24}/></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Stock Logs</span>
           </button>
           <button onClick={() => setPage(Page.EXPENSES)} className="bg-white dark:bg-emerald-900/40 p-5 rounded-[28px] border border-slate-100 dark:border-emerald-800/40 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/40 rounded-2xl text-purple-600"><Receipt size={24}/></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Expenses</span>
           </button>
        </div>
      </section>

      {/* SECTION 4: DATA & SYNC */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data & Sync</h2>
        </div>

        <div className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw size={16} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-emerald-100">Inventory Sync</span>
          </div>
          {isAdmin ? (
            <button onClick={handlePushUpdateToStaff} disabled={isUpdatingInventory} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-emerald-100">
              {isUpdatingInventory ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Push Update to Staff
            </button>
          ) : (
            <div className="bg-slate-50 dark:bg-emerald-950 p-4 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Only Shop Boss can push updates.</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Database size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-emerald-100">Business Backup</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
               <button onClick={handleBackup} disabled={isBackingUp} className="w-full bg-slate-900 dark:bg-emerald-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] active:scale-95 shadow-lg">
                 {isBackingUp ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>} Export To Phone
               </button>
               <label className="w-full bg-white dark:bg-emerald-950 border-2 border-emerald-100 dark:border-emerald-800 text-emerald-600 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] cursor-pointer active:scale-95">
                  <input type="file" className="hidden" accept=".json,.gz" onChange={() => {}} />
                  <Database size={18}/> Restore From File
               </label>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white dark:bg-emerald-900/40 border border-slate-50 dark:border-emerald-800/40 p-6 rounded-[32px] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-emerald-100">Staff Members</span>
              </div>
              <button onClick={() => setShowAddUser(true)} className="p-2 bg-emerald-50 dark:bg-emerald-800 rounded-xl text-emerald-600"><Plus size={16}/></button>
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
                  {u.role === 'Staff' && <button onClick={() => generateStaffInviteKey(u)} className="p-2 text-emerald-500 active:scale-90 transition-all"><Share2 size={16}/></button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Staff Add Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase italic tracking-tight">New Staff</h2>
                <button onClick={() => setShowAddUser(false)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddUser} className="space-y-4">
                <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <input required type="password" maxLength={4} pattern="\d{4}" placeholder="4-Digit PIN" className="w-full p-4 bg-slate-50 dark:bg-emerald-950 rounded-2xl border font-bold text-center text-xl tracking-widest" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg">Save Staff Account</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
