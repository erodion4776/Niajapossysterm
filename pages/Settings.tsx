
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  FileJson, CheckCircle, Share2, RefreshCw, AlertTriangle, ShieldCheck, Database 
} from 'lucide-react';
import { Role } from '../types.ts';

interface SettingsProps {
  role: Role;
  setRole: (role: Role) => void;
}

export const Settings: React.FC<SettingsProps> = ({ role, setRole }) => {
  const isAdmin = role === 'Admin';
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || '');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || '');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const users = useLiveQuery(() => db.users.toArray());

  useEffect(() => {
    localStorage.setItem('shop_name', shopName);
  }, [shopName]);

  useEffect(() => {
    localStorage.setItem('shop_info', shopInfo);
  }, [shopInfo]);

  const handleBackup = async () => {
    const inventory = await db.inventory.toArray();
    const sales = await db.sales.toArray();
    const expenses = await db.expenses.toArray();
    backupToWhatsApp({ inventory, sales, expenses, timestamp: Date.now() });
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
        // Resilient mapping: check common keys used in exports
        const rawData = json.inventory || json.products || json.items || (Array.isArray(json) ? json : []);
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
          alert('Error: No valid product data found in this JSON file.');
          return;
        }

        const confirmMsg = `Found ${rawData.length} products. This will UPDATE your stock levels but KEEPS your Admin profile and staff list safe. Proceed?`;

        if (confirm(confirmMsg)) {
          setIsImporting(true);
          
          let updatedCount = 0;
          let addedCount = 0;

          await db.transaction('rw', [db.inventory], async () => {
            const currentInventory = await db.inventory.toArray();
            
            for (const item of rawData) {
              // Normalize fields (handle various JSON formats)
              const name = item.name || item.Name || item.title || "";
              const sellingPrice = Number(item.sellingPrice || item.SellingPrice || item.price || item.Price || 0);
              const costPrice = Number(item.costPrice || item.CostPrice || item.cost || item.Cost || 0);
              const stock = Number(item.stock || item.Stock || item.qty || item.quantity || 0);
              const category = item.category || item.Category || 'General';

              if (!name) continue;

              // Match by Name (Case-insensitive)
              const existing = currentInventory.find(i => 
                i.name.trim().toLowerCase() === name.trim().toLowerCase()
              );

              if (existing) {
                // Update existing item while keeping its internal ID
                await db.inventory.update(existing.id!, {
                  stock,
                  sellingPrice,
                  costPrice: costPrice > 0 ? costPrice : existing.costPrice,
                  category
                });
                updatedCount++;
              } else {
                // Add as new item
                await db.inventory.add({
                  name,
                  stock,
                  sellingPrice,
                  costPrice,
                  category,
                  dateAdded: new Date().toISOString()
                });
                addedCount++;
              }
            }
          });

          alert(`✅ Import Complete!\n- Updated: ${updatedCount} existing items\n- Added: ${addedCount} new items\n\nYour shop profile and staff accounts were preserved.`);
          window.location.reload();
        }
      } catch (err) {
        alert('❌ Import Failed: ' + (err as Error).message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const deleteUser = async (id: number | string) => {
    if (confirm('Delete this user?')) {
      await db.users.delete(id);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Shop Admin</h1>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Master Controls</p>
      </header>

      {/* 1. Sync Section - Dedicated to Stock Only */}
      {isAdmin && (
        <section className="bg-emerald-600 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <RefreshCw size={24} className={isImporting ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none">Stock Sync</h2>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mt-1">Update Products Only</p>
            </div>
          </div>
          <p className="text-xs font-medium opacity-90 leading-relaxed">
            Upload your inventory file. We will update prices and quantities. Your <b>Staff accounts</b> and <b>Shop Settings</b> will not be affected.
          </p>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleSmartImport} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
          >
            {isImporting ? 'Processing...' : 'Upload Stock JSON'}
            {!isImporting && <Database size={16} />}
          </button>
          <div className="flex items-center gap-2 bg-emerald-700/30 p-3 rounded-xl">
            <ShieldCheck size={14} className="text-emerald-300" />
            <p className="text-[9px] font-bold uppercase tracking-wider">Identity Protected: Users & Login PINs will stay safe.</p>
          </div>
        </section>
      )}

      {/* 2. Device Sync */}
      {isAdmin && (
        <section className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none text-white">Device Cloning</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Connect Staff Phone</p>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-400 leading-relaxed">
            Generate a Setup Key to sync this shop's data to another employee's smartphone.
          </p>
          <button 
            onClick={async () => {
              setIsGenerating(true);
              await generateShopKey();
              setIsGenerating(false);
            }}
            disabled={isGenerating}
            className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
          >
            {isGenerating ? 'Generating...' : 'Get Setup Key'}
            {!isGenerating && <Share2 size={16} />}
          </button>
        </section>
      )}

      {/* 3. Shop Identity */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Information
        </h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Business Name</label>
            <input 
              disabled={!isAdmin}
              type="text" 
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Location / Phone</label>
            <input 
              disabled={!isAdmin}
              type="text" 
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
              value={shopInfo}
              onChange={(e) => setShopInfo(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 4. Staff Management */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Shop Staff
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full">
              <Plus size={14} /> Register
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
                <button onClick={() => u.id && deleteUser(u.id)} className="text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5. Full Backup */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Full Export
        </h2>
        <button 
          onClick={handleBackup}
          className="w-full flex items-center justify-between p-5 bg-emerald-50 text-emerald-700 rounded-2xl active:scale-[0.98] transition-all border border-emerald-100"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600">
              <CloudUpload size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-lg leading-none">Share to WhatsApp</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Export full database</p>
            </div>
          </div>
        </button>
      </section>

      {/* Modals */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Staff Register</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input required placeholder="Staff Name" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input required placeholder="4-Digit PIN" maxLength={4} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-center tracking-[1em]" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-gray-100 p-8 rounded-[40px] text-center space-y-4">
        <p className="text-[10px] text-gray-400 font-black leading-relaxed uppercase tracking-[0.2em]">
          NaijaShop Pro • Lagos, Nigeria
        </p>
      </div>
    </div>
  );
};
