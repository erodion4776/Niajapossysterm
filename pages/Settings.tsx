import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import pako from 'pako';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, HelpCircle, ChevronDown, BookOpen, Loader2, CheckCircle2,
  Moon, Sun, Key
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';
import { useTheme } from '../ThemeContext.tsx';

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
  const [isImporting, setIsImporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  
  const [importStats, setImportStats] = useState<{sales: number, inventory: number, debts: number, expenses: number} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleTotalRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        let jsonStr = '';
        const result = event.target?.result;

        if (!result) throw new Error("Could not read file");

        if (file.name.endsWith('.gz') || (result instanceof ArrayBuffer && new Uint8Array(result)[0] === 0x1f)) {
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
          setIsImporting(true);
          await clearAllData();
          await db.transaction('rw', [db.inventory, db.sales, db.expenses, db.debts, db.users, db.settings], async () => {
            if (inv.length > 0) await db.inventory.bulkAdd(inv.map(({id, ...rest}: any) => rest));
            if (sls.length > 0) await db.sales.bulkAdd(sls.map(({id, ...rest}: any) => rest));
            if (exp.length > 0) await db.expenses.bulkAdd(exp.map(({id, ...rest}: any) => rest));
            if (dbt.length > 0) await db.debts.bulkAdd(dbt.map(({id, ...rest}: any) => rest));
            if (usr.length > 0) await db.users.bulkAdd(usr.map(({id, ...rest}: any) => rest));
            if (setts.length > 0) await db.settings.bulkAdd(setts);
          });

          setImportStats({ inventory: inv.length, sales: sls.length, debts: dbt.length, expenses: exp.length });
          const restoredName = json.shopName || localStorage.getItem('shop_name');
          if (restoredName) localStorage.setItem('shop_name', restoredName);
        }
      } catch (err) { 
        alert('Restore failed. Ensure you selected a valid NaijaShop backup file.'); 
      } finally { 
        setIsImporting(false); 
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.gz')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
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
          <button 
            onClick={toggleTheme}
            className="relative w-14 h-8 bg-slate-100 dark:bg-emerald-800 rounded-full p-1 transition-colors duration-300"
          >
            <div className={`w-6 h-6 bg-white dark:bg-emerald-400 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
               {theme === 'dark' ? <Moon size={12} className="text-emerald-950" /> : <Sun size={12} className="text-amber-500" />}
            </div>
          </button>
        </div>
      </section>

      {showBackupSuccess && (
        <BackupSuccessModal isOpen={showBackupSuccess} onClose={() => setShowBackupSuccess(false)} fileName={backupFileName} />
      )}

      {importStats && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in duration-300">
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

      {isAdmin && (
        <>
          {/* Total System Restore */}
          <section className="bg-emerald-600 p-6 rounded-[32px] shadow-xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <RefreshCw size={24} className={isImporting ? 'animate-spin' : ''} />
              </div>
              <div>
                <h2 className="text-lg font-black leading-none uppercase">Total System Restore</h2>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mt-1">Import All Records</p>
              </div>
            </div>
            <input type="file" accept=".json,.gz" className="hidden" ref={fileInputRef} onChange={handleTotalRestore} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
              {isImporting ? 'Securing history...' : 'Import Full Backup'} <Database size={16} />
            </button>
          </section>

          {/* Clone to Staff / Staff Key Section */}
          <section className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black leading-none uppercase">Clone to Staff</h2>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Generate Access Key</p>
              </div>
            </div>
            <button 
              onClick={async () => { 
                setIsGenerating(true); 
                await generateShopKey(); 
                setIsGenerating(false); 
              }} 
              disabled={isGenerating}
              className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Get Staff Sync Key'} <Share2 size={16} />
            </button>
          </section>
        </>
      )}

      {/* Active Staff List */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Active Staff
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1 bg-emerald-50 dark:bg-emerald-800/30 px-3 py-1.5 rounded-full">
              <Plus size={14} /> New Staff
            </button>
          )}
        </div>
        <div className="space-y-3">
          {users?.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-100 dark:border-emerald-800/20">
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
                <button onClick={() => u.id && db.users.delete(u.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Shop Information */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Information
        </h2>
        <div className="space-y-4">
          <input disabled={!isAdmin} type="text" placeholder="Business Name" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-800/20 rounded-2xl font-bold text-sm text-slate-800 dark:text-emerald-50" value={shopName} onChange={(e) => setShopName(e.target.value)} />
          <input disabled={!isAdmin} type="text" placeholder="Address / Phone" className="w-full px-4 py-3.5 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-800/20 rounded-2xl font-bold text-sm text-slate-800 dark:text-emerald-50" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)} />
        </div>
      </section>

      {/* Deep History Backup */}
      <section className="bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-slate-100 dark:border-emerald-800/40 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-slate-400 dark:text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Deep History Backup
        </h2>
        <button 
          onClick={handleBackup} 
          disabled={isBackingUp}
          className={`w-full flex items-center justify-between p-5 rounded-2xl border active:scale-95 transition-all ${isBackingUp ? 'bg-gray-50 dark:bg-emerald-950/20 border-gray-200 dark:border-emerald-800 text-gray-400' : 'bg-emerald-50 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-sm ${isBackingUp ? 'bg-gray-100 dark:bg-emerald-900' : 'bg-white dark:bg-emerald-950'}`}>
              {isBackingUp ? <Loader2 size={24} className="animate-spin" /> : <CloudUpload size={24} />}
            </div>
            <div className="text-left">
              <p className="font-black text-lg leading-none">{isBackingUp ? 'Securing history...' : 'WhatsApp Backup'}</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Total System Export</p>
            </div>
          </div>
        </button>
      </section>

      {/* Add Staff Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl border dark:border-emerald-800">
            <h2 className="text-2xl font-black mb-6 text-slate-800 dark:text-emerald-50 uppercase tracking-tight">Register Staff</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input required placeholder="Staff Name" className="w-full p-4 bg-slate-50 dark:bg-emerald-950/40 border dark:border-emerald-800/40 rounded-2xl font-bold dark:text-emerald-50" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input required placeholder="PIN" maxLength={4} className="w-full p-4 bg-slate-50 dark:bg-emerald-950/40 border dark:border-emerald-800/40 rounded-2xl font-bold text-center tracking-widest dark:text-emerald-50" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl uppercase tracking-widest text-[10px]">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};