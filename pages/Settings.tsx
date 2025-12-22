
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { CloudUpload, User as UserIcon, Info, Store, MapPin, Smartphone, Plus, Trash2, FileJson, CheckCircle, Share2, AlertCircle, RefreshCw } from 'lucide-react';
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
        const data = json.inventory || json.products || [];
        
        if (data.length === 0) {
          alert('No valid inventory found in this file.');
          return;
        }

        if (confirm(`Detected ${data.length} items. This will merge them with your current stock. Existing items with the same name will be updated. Proceed?`)) {
          setIsImporting(true);
          
          let updatedCount = 0;
          let addedCount = 0;

          await db.transaction('rw', [db.inventory], async () => {
            const currentInventory = await db.inventory.toArray();
            
            for (const newItem of data) {
              // Try to find matching item by ID or Name
              const existing = currentInventory.find(i => 
                (newItem.id && i.id === newItem.id) || 
                (i.name.trim().toLowerCase() === newItem.name.trim().toLowerCase())
              );

              if (existing) {
                // Update existing item
                await db.inventory.update(existing.id!, {
                  stock: newItem.stock,
                  sellingPrice: newItem.sellingPrice,
                  costPrice: newItem.costPrice || existing.costPrice,
                  category: newItem.category || existing.category
                });
                updatedCount++;
              } else {
                // Add new item (strip old ID to prevent collision)
                const { id, ...cleanItem } = newItem;
                await db.inventory.add(cleanItem);
                addedCount++;
              }
            }
          });

          alert(`Import Successful!\nUpdated: ${updatedCount} items\nAdded: ${addedCount} new items`);
          window.location.reload();
        }
      } catch (err) {
        alert('Import Error: ' + (err as Error).message);
      } finally {
        setIsImporting(false);
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
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin Settings</h1>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Management & Security</p>
      </header>

      {/* Smart Stock Merge - REBUILT FOR RELIABILITY */}
      {isAdmin && (
        <section className="bg-emerald-600 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <RefreshCw size={24} className={isImporting ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none">Smart Data Merge</h2>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mt-1">Sync External Stock</p>
            </div>
          </div>
          <p className="text-xs font-medium opacity-90 leading-relaxed">
            Upload a JSON backup to update your inventory. We will match items by name so your existing records stay organized.
          </p>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleSmartImport} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
          >
            {isImporting ? 'Merging Data...' : 'Merge Inventory'}
            {!isImporting && <FileJson size={16} />}
          </button>
        </section>
      )}

      {/* Staff Device Sync */}
      {isAdmin && (
        <section className="bg-emerald-950 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none">Clone to Staff Phone</h2>
              <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider mt-1">Remote Access Setup</p>
            </div>
          </div>
          <p className="text-xs font-medium opacity-80 leading-relaxed">
            Generate a Setup Key to clone your shop and staff list to another phone.
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

      {/* Shop Identity */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Information
        </h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase ml-2">Business Name</span>
            <input 
              disabled={!isAdmin}
              type="text" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase ml-2">Address / Phone</span>
            <input 
              disabled={!isAdmin}
              type="text" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
              value={shopInfo}
              onChange={(e) => setShopInfo(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* User Management */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Registered Accounts
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
              <Plus size={14} /> Register Staff
            </button>
          )}
        </div>
        <div className="space-y-3">
          {users?.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  <UserIcon size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm leading-none">{u.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">PIN: {u.pin} • {u.role}</p>
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

      {/* Backup */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Database Export
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
              <p className="font-black text-lg leading-none">Backup to WhatsApp</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Save your shop records</p>
            </div>
          </div>
        </button>
      </section>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Staff Register</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input required placeholder="Name" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input required placeholder="PIN" maxLength={4} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-center tracking-[1em]" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-gray-100 p-8 rounded-[40px] text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
          <Info className="text-gray-300" size={28} />
        </div>
        <h3 className="text-lg font-black text-gray-800">NaijaShop Pro</h3>
        <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest">
          Secure. Offline-First. <br/> Nigeria's Leading Shop POS.
        </p>
      </div>
    </div>
  );
};
