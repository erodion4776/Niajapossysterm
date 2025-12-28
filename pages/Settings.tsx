
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData, User } from '../db.ts';
import { backupToWhatsApp, generateShopKey, reconcileStaffSales, generateMasterStockKey, generateStaffInviteKey } from '../utils/whatsapp.ts';
import pako from 'pako';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, HelpCircle, ChevronDown, BookOpen, Loader2, CheckCircle2,
  Moon, Sun, Key, Users, X, Send, Printer, Bluetooth, ShieldAlert, Wifi
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';
import { useTheme } from '../ThemeContext.tsx';
import { connectBluetoothPrinter, disconnectPrinter, isPrinterReady } from '../utils/bluetoothPrinter.ts';

interface SettingsProps {
  role: Role;
  setRole: (role: Role) => void;
  setPage: (page: Page) => void;
}

export const Settings: React.FC<SettingsProps> = ({ role, setRole, setPage }) => {
  const isAdmin = role === 'Admin';
  const { theme, toggleTheme } = useTheme();
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || '');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || '');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [printerStatus, setPrinterStatus] = useState(() => isPrinterReady() ? 'Connected' : 'Disconnected');
  const [printerName, setPrinterName] = useState(() => localStorage.getItem('last_printer_name'));
  
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  
  const [importStats, setImportStats] = useState<{sales: number, inventory: number, debts: number, expenses: number} | null>(null);
  const [reconcileResult, setReconcileResult] = useState<{merged: number, skipped: number} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconcileInputRef = useRef<HTMLInputElement>(null);

  const users = useLiveQuery(() => db.users.toArray());

  useEffect(() => {
    localStorage.setItem('shop_name', shopName);
  }, [shopName]);

  useEffect(() => {
    localStorage.setItem('shop_info', shopInfo);
  }, [shopInfo]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const inventory = await db.inventory.toArray();
      const sales = await db.sales.toArray();
      const expenses = await db.expenses.toArray();
      const debts = await db.debts.toArray();
      const usersList = await db.users.toArray();
      const settings = await db.settings.toArray();
      
      const result = await backupToWhatsApp({ 
        inventory, 
        sales, 
        expenses, 
        debts,
        users: usersList,
        settings,
        shopName,
        shopInfo,
        timestamp: Date.now() 
      });

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

  const handlePairPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      const name = await connectBluetoothPrinter();
      setPrinterName(name);
      setPrinterStatus('Connected');
    } catch (err: any) {
      alert("Pairing failed: " + err.message);
      setPrinterStatus('Disconnected');
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleUnpairPrinter = () => {
    disconnectPrinter();
    setPrinterName(null);
    setPrinterStatus('Disconnected');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.pin) return;
    await db.users.add({
      ...newUser,
      id: `user-${Date.now()}`
    });
    setNewUser({ name: '', pin: '', role: 'Staff' as Role });
    setShowAddUser(false);
  };

  const handleReconcileMerge = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsMerging(true);
        let jsonStr = '';
        const result = event.target?.result;

        if (file.name.endsWith('.gz') || (result instanceof ArrayBuffer && new Uint8Array(result as ArrayBuffer)[0] === 0x1f)) {
          const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer));
          jsonStr = new TextDecoder().decode(decompressed);
        } else if (typeof result === 'string') {
          jsonStr = result;
        } else {
          jsonStr = new TextDecoder().decode(result as ArrayBuffer);
        }

        const staffData = JSON.parse(jsonStr);
        const report = await reconcileStaffSales(staffData);
        setReconcileResult({ merged: report.merged, skipped: report.skipped });
      } catch (err) {
        alert('Reconciliation failed: ' + (err as Error).message);
      } finally {
        setIsMerging(false);
        if (reconcileInputRef.current) reconcileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.gz')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const handleTotalRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        let jsonStr = '';
        const result = event.target?.result;

        if (file.name.endsWith('.gz') || (result instanceof ArrayBuffer && new Uint8Array(result as ArrayBuffer)[0] === 0x1f)) {
          const decompressed = pako.ungzip(new Uint8Array(result as ArrayBuffer));
          jsonStr = new TextDecoder().decode(decompressed);
        } else if (typeof result === 'string') {
          jsonStr = result;
        } else {
          jsonStr = new TextDecoder().decode(result as ArrayBuffer);
        }

        const json = JSON.parse(jsonStr);
        const inv = json.inventory || [];
        const sls = json.sales || [];
        const exp = json.expenses || [];
        const dbt = json.debts || [];
        const usr = json.users || [];
        const setts = json.settings || [];

        const totalRecords = inv.length + sls.length + exp.length + dbt.length + usr.length;

        if (confirm(`⚠️ TOTAL SYSTEM RESTORE: This will delete everything currently on this phone and replace it with ${totalRecords} historical records. Are you sure?`)) {
          await clearAllData();
          await db.transaction('rw', [db.inventory, db.sales, db.expenses, db.debts, db.users, db.settings], async () => {
            if (inv.length > 0) await db.inventory.bulkAdd(inv.map(({id, ...rest}: any) => rest));
            if (sls.length > 0) await db.sales.bulkAdd(sls.map(({id, ...rest}: any) => rest));
            if (exp.length > 0) await db.expenses.bulkAdd(exp.map(({id, ...rest}: any) => rest));
            if (dbt.length > 0) await db.debts.bulkAdd(dbt.map(({id, ...rest}: any) => dbt));
            if (usr.length > 0) await db.users.bulkAdd(usr.map(({id, ...rest}: any) => rest));
            if (setts.length > 0) await db.settings.bulkAdd(setts);
          });

          setImportStats({ inventory: inv.length, sales: sls.length, debts: dbt.length, expenses: exp.length });
          const restoredName = json.shopName || localStorage.getItem('shop_name');
          if (restoredName) localStorage.setItem('shop_name', restoredName);
        }
      } catch (err) { 
        alert('Restore failed. Error: ' + (err as Error).message); 
      } finally { 
        setIsImporting(false); 
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.gz')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const handleSetupStaffPhone = async (user: User) => {
    if (confirm(`Generate Invite Code for ${user.name}? This will include your current inventory and their secret PIN.`)) {
      await generateStaffInviteKey(user);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 transition-colors duration-300">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-emerald-50 tracking-tight">Admin</h1>
          <p className="text-slate-400 dark:text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">Shop Management</p>
        </div>
        <button 
          onClick={() => setPage(Page.FAQ)}
          className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase border border-emerald-100 dark:border-emerald-800/40 shadow-sm"
        >
          <HelpCircle size={18} /> Help Center
        </button>
      </header>

      {/* Printer Setup Card */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-2xl text-blue-600 dark:text-blue-400">
            <Printer size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Printer Setup</h2>
            <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">Bluetooth Thermal (58mm)</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-emerald-950/40 p-5 rounded-3xl border border-slate-100 dark:border-emerald-800/20 space-y-4">
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${printerStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-[10px] font-black uppercase ${printerStatus === 'Connected' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {printerStatus}
                </span>
              </div>
           </div>
           {printerName && (
             <div className="flex justify-between items-center border-t border-slate-100 dark:border-emerald-800/40 pt-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paired Printer</span>
                <span className="text-[10px] font-black text-slate-800 dark:text-emerald-50 truncate max-w-[150px]">{printerName}</span>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={handlePairPrinter} 
            disabled={isConnectingPrinter}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all disabled:opacity-50"
          >
            {isConnectingPrinter ? <Loader2 size={16} className="animate-spin" /> : <Bluetooth size={16} />}
            {isConnectingPrinter ? 'Searching...' : 'Find & Pair Printer'}
          </button>
          {printerStatus === 'Connected' && (
             <button 
               onClick={handleUnpairPrinter}
               className="w-full py-3 text-red-400 font-bold uppercase text-[9px] tracking-widest"
             >
               Unpair Device
             </button>
          )}
        </div>
      </section>

      {/* Theme Switcher Toggle */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-50 dark:bg-emerald-800/30 p-2.5 rounded-2xl text-emerald-600 dark:text-emerald-400">
                {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
             </div>
             <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">App Theme</h2>
                <p className="text-[9px] text-slate-400 dark:text-emerald-500/40 font-bold uppercase">{theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}</p>
             </div>
          </div>
          <button onClick={toggleTheme} className="relative w-14 h-8 bg-slate-100 dark:bg-emerald-800 rounded-full p-1 transition-colors duration-300">
            <div className={`w-6 h-6 bg-white dark:bg-emerald-400 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
               {theme === 'dark' ? <Moon size={12} className="text-emerald-950" /> : <Sun size={12} className="text-amber-500" />}
            </div>
          </button>
        </div>
      </section>

      {isAdmin && (
        <>
          <section className="bg-emerald-950 p-6 rounded-[32px] shadow-2xl text-white space-y-6 relative overflow-hidden border border-emerald-800">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400 border border-emerald-500/20">
                  <RefreshCw size={24} className={isMerging ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h2 className="text-lg font-black leading-none uppercase">Daily Reconciliation</h2>
                  <p className="text-emerald-500/60 text-[10px] font-bold uppercase tracking-wider mt-1">Merge Staff Sales & Update Stock</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <input type="file" accept=".json,.gz" className="hidden" ref={reconcileInputRef} onChange={handleReconcileMerge} />
                <button 
                  onClick={() => reconcileInputRef.current?.click()} 
                  disabled={isMerging}
                  className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isMerging ? 'Merging records...' : '1. Import Staff Sales'} <Smartphone size={16} />
                </button>

                <button 
                  onClick={async () => { setIsSyncingStock(true); await generateMasterStockKey(); setIsSyncingStock(false); }}
                  disabled={isSyncingStock}
                  className="w-full bg-white text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  {isSyncingStock ? 'Generating update...' : '2. Send Master Stock to Staff'} <Share2 size={16} />
                </button>
              </div>
            </div>
            <Users size={120} className="absolute -right-8 -bottom-8 opacity-5 text-emerald-500" />
          </section>

          <section className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400 border border-emerald-500/20">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black leading-none uppercase tracking-tight">Clone New Phone</h2>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Setup Additional Staff Device</p>
              </div>
            </div>
            <button 
              onClick={async () => { setIsGenerating(true); await generateShopKey(); setIsGenerating(false); }} 
              disabled={isGenerating}
              className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Get Full Setup Key'} <Share2 size={16} />
            </button>
          </section>
        </>
      )}

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
          <Database size={14} /> Full Data Control
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <input type="file" accept=".json,.gz" className="hidden" ref={fileInputRef} onChange={handleTotalRestore} />
          <button 
             onClick={() => fileInputRef.current?.click()} 
             className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-800/20 rounded-2xl"
          >
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-emerald-900 rounded-xl text-emerald-600 dark:text-emerald-400"><Database size={20} /></div>
                <p className="text-xs font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Full System Restore</p>
             </div>
             <ChevronDown size={18} className="text-slate-300 -rotate-90" />
          </button>

          <button 
            onClick={handleBackup} 
            disabled={isBackingUp}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isBackingUp ? 'bg-gray-50 dark:bg-emerald-950/20 border-gray-200 dark:border-emerald-800 text-gray-400' : 'bg-emerald-50 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-emerald-900 rounded-xl"><CloudUpload size={20} /></div>
              <p className="text-xs font-black uppercase tracking-tight">WhatsApp Backup</p>
            </div>
            {isBackingUp && <Loader2 size={16} className="animate-spin" />}
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Active Staff
          </h2>
          {isAdmin && (
            <button 
              onClick={() => setShowAddUser(true)} 
              className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1 bg-emerald-50 dark:bg-emerald-800/30 px-3 py-1.5 rounded-full"
            >
              <Plus size={14} /> New Staff
            </button>
          )}
        </div>
        <div className="space-y-3">
          {users?.map(u => (
            <div key={u.id} className="flex flex-col p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-100 dark:border-emerald-800/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${u.role === 'Admin' ? 'bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'}`}>
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-emerald-50 text-sm leading-none">{u.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-emerald-500/40 uppercase mt-1 tracking-wider">PIN: {u.pin} • {u.role}</p>
                  </div>
                </div>
                {isAdmin && u.role !== 'Admin' && (
                  <button onClick={() => u.id && db.users.delete(u.id)} className="text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              {isAdmin && u.role === 'Staff' && (
                <button 
                  onClick={() => handleSetupStaffPhone(u)}
                  className="w-full bg-white dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send size={14} /> Setup Staff Phone
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Information
        </h2>
        <div className="space-y-4">
          <input disabled={!isAdmin} type="text" placeholder="Business Name" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-800/20 rounded-2xl font-bold text-sm text-slate-800 dark:text-emerald-50" value={shopName} onChange={(e) => setShopName(e.target.value)} />
          <input disabled={!isAdmin} type="text" placeholder="Address / Phone" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-800/20 rounded-2xl font-bold text-sm text-slate-800 dark:text-emerald-50" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)} />
        </div>
      </section>

      {showAddUser && (
        <div className="fixed inset-0 z-[500] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl border dark:border-emerald-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Register Staff</h2>
              <button onClick={() => setShowAddUser(false)} className="p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest ml-2">Staff Name</label>
                <input required placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-emerald-950/40 border dark:border-emerald-800/40 rounded-2xl font-bold dark:text-emerald-50" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest ml-2">4-Digit PIN</label>
                <input required placeholder="0000" maxLength={4} inputMode="numeric" className="w-full p-4 bg-slate-50 dark:bg-emerald-950/40 border dark:border-emerald-800/40 rounded-2xl font-bold text-center tracking-[1em] dark:text-emerald-50" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-200 dark:shadow-none">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBackupSuccess && (
        <BackupSuccessModal 
          isOpen={showBackupSuccess} 
          onClose={() => setShowBackupSuccess(false)} 
          fileName={backupFileName} 
        />
      )}

      {importStats && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-emerald-900 rounded-[40px] p-8 w-full max-w-xs text-center space-y-6 shadow-2xl border border-emerald-800">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Restore Complete!</h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest mt-1">Deep History Restored</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
                <p className="text-[8px] font-black text-slate-400 uppercase">Sales</p>
                <p className="text-lg font-black text-emerald-600">{importStats.sales}</p>
              </div>
              <div className="bg-slate-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
                <p className="text-[8px] font-black text-slate-400 uppercase">Stock</p>
                <p className="text-lg font-black text-blue-600">{importStats.inventory}</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95">Restart & Login</button>
          </div>
        </div>
      )}
    </div>
  );
};
