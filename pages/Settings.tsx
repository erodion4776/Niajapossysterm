import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  Database, ShieldCheck, Share2, RefreshCw, HelpCircle, ChevronDown, BookOpen, Loader2
} from 'lucide-react';
import { Role, Page } from '../types.ts';
import { BackupSuccessModal } from '../components/BackupSuccessModal.tsx';

interface SettingsProps {
  role: Role;
  setRole: (role: Role) => void;
  setPage: (page: Page) => void;
}

export const Settings: React.FC<SettingsProps> = ({ role, setRole, setPage }) => {
  const isAdmin = role === 'Admin';
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || '');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || '');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  
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
      
      const result = await backupToWhatsApp({ 
        inventory, 
        sales, 
        expenses, 
        debts,
        users: usersList,
        shopName,
        shopInfo,
        timestamp: Date.now() 
      });

      if (result.success && result.method === 'DOWNLOAD') {
        setBackupFileName(result.fileName || 'NaijaShop_Backup.json');
        setShowBackupSuccess(true);
      } else if (result.success) {
        // WhatsApp share was successful (no modal needed usually, or just a small toast)
      } else {
        alert("Backup failed. Please try again.");
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

  const handleSmartImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const productsData = json.products || json.inventory || json.items || [];
        const salesData = json.sales || [];
        
        if (productsData.length === 0 && salesData.length === 0) {
          alert('No compatible data found in this JSON file.');
          return;
        }

        if (confirm(`Found ${productsData.length} products and ${salesData.length} sales. Merge them?`)) {
          setIsImporting(true);
          await db.transaction('rw', [db.inventory, db.sales], async () => {
            const currentInventory = await db.inventory.toArray();
            for (const item of productsData) {
              const name = item.name || item.Name || "";
              const existing = currentInventory.find(i => i.name.trim().toLowerCase() === name.trim().toLowerCase());
              if (existing) {
                await db.inventory.update(existing.id!, {
                  stock: Number(item.stock || 0),
                  sellingPrice: Number(item.price || item.sellingPrice || existing.sellingPrice),
                  costPrice: Number(item.cost || item.costPrice || existing.costPrice)
                });
              } else {
                await db.inventory.add({
                  name,
                  stock: Number(item.stock || 0),
                  sellingPrice: Number(item.price || item.sellingPrice || 0),
                  costPrice: Number(item.cost || item.costPrice || 0),
                  category: item.category || 'General',
                  dateAdded: item.dateAdded || new Date().toISOString()
                });
              }
            }
          });
          alert('Import Success!');
          window.location.reload();
        }
      } catch (err) { alert('Error: ' + (err as Error).message); }
      finally { setIsImporting(false); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Shop Management</p>
        </div>
        <button 
          onClick={() => setPage(Page.FAQ)}
          className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase border border-emerald-100 shadow-sm"
        >
          <HelpCircle size={18} /> Help Center
        </button>
      </header>

      {/* Backup Success Modal */}
      <BackupSuccessModal 
        isOpen={showBackupSuccess} 
        onClose={() => setShowBackupSuccess(false)} 
        fileName={backupFileName} 
      />

      {/* Master Setup Guide (Accordion) */}
      {isAdmin && (
        <section className="bg-white border border-emerald-100 rounded-[32px] overflow-hidden shadow-sm">
          <button 
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex items-center justify-between p-6 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 text-white p-2 rounded-xl">
                <BookOpen size={20} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-black text-emerald-950 uppercase">Master Setup Guide</h2>
                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">How to Setup Staff Phones</p>
              </div>
            </div>
            {isGuideOpen ? <ChevronDown size={20} className="text-emerald-400 rotate-180 transition-transform" /> : <ChevronDown size={20} className="text-emerald-400 transition-transform" />}
          </button>
          
          {isGuideOpen && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top duration-300">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">1</span>
                  <div>
                    <h3 className="text-xs font-black text-gray-800 uppercase mb-1">The Master Key</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">First, ensure this Admin phone is activated. Your Request Code is the "Master Identity" for this branch.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">2</span>
                  <div>
                    <h3 className="text-xs font-black text-gray-800 uppercase mb-1">Exporting Data</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">Use "Get Setup Key" below. This creates a secure token containing your current inventory and staff logins.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">3</span>
                  <div>
                    <h3 className="text-xs font-black text-gray-800 uppercase mb-1">Share via WhatsApp</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">Send the Setup Key to your staff's WhatsApp. It is encrypted and safe from outsiders.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">4</span>
                  <div>
                    <h3 className="text-xs font-black text-gray-800 uppercase mb-1">The Staff Import</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">On the staff phone, they click "New Staff Setup" on login and paste your key. This clones your shop instantly.</p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="text-amber-600 flex-shrink-0" size={18} />
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                  <span className="uppercase text-amber-900 block mb-1">Safety Note:</span>
                  Never share your Admin PIN. Staff can record sales, but only the Admin can see profits and delete records.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="bg-emerald-600 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <RefreshCw size={24} className={isImporting ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none uppercase">Smart Data Merge</h2>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mt-1">Update Stock Levels</p>
            </div>
          </div>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleSmartImport} />
          <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
            Import JSON <Database size={16} />
          </button>
        </section>
      )}

      {isAdmin && (
        <section className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none uppercase">Clone to Staff</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Staff Access Key</p>
            </div>
          </div>
          <button onClick={async () => { setIsGenerating(true); await generateShopKey(); setIsGenerating(false); }} className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
            {isGenerating ? 'Generating...' : 'Get Setup Key'} <Share2 size={16} />
          </button>
        </section>
      )}

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Active Staff
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full">
              <Plus size={14} /> New Staff
            </button>
          )}
        </div>
        <div className="space-y-3">
          {users?.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  <UserIcon size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm leading-none">{u.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-wider">PIN: {u.pin} • {u.role}</p>
                </div>
              </div>
              {isAdmin && u.role !== 'Admin' && (
                <button onClick={() => u.id && db.users.delete(u.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Information
        </h2>
        <div className="space-y-4">
          <input disabled={!isAdmin} type="text" placeholder="Business Name" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm" value={shopName} onChange={(e) => setShopName(e.target.value)} />
          <input disabled={!isAdmin} type="text" placeholder="Address / Phone" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)} />
        </div>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Backup & Share
        </h2>
        <button 
          onClick={handleBackup} 
          disabled={isBackingUp}
          className={`w-full flex items-center justify-between p-5 rounded-2xl border active:scale-95 transition-all ${isBackingUp ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl shadow-sm ${isBackingUp ? 'bg-gray-100' : 'bg-white'}`}>
              {isBackingUp ? <Loader2 size={24} className="animate-spin" /> : <CloudUpload size={24} />}
            </div>
            <div className="text-left">
              <p className="font-black text-lg leading-none">{isBackingUp ? 'Processing...' : 'WhatsApp Backup'}</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Daily Safety Export</p>
            </div>
          </div>
        </button>
      </section>

      {showAddUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Register Staff</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input required placeholder="Staff Name" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input required placeholder="PIN" maxLength={4} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-center tracking-widest" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
