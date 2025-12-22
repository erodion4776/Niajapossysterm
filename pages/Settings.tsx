
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { CloudUpload, User as UserIcon, Info, Store, MapPin, Smartphone, Plus, Trash2, FileJson, CheckCircle, Share2, AlertCircle } from 'lucide-react';
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

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        const confirmMsg = json.users 
          ? 'Importing this file will OVERWRITE current Users and Staff. Continue?' 
          : 'Importing this file will merge inventory and sales data. Current staff will remain active. Continue?';

        if (confirm(confirmMsg)) {
          setIsImporting(true);
          
          await db.transaction('rw', [db.inventory, db.users, db.sales, db.expenses, db.stockLogs], async () => {
            // Restore Inventory
            if (json.inventory || json.products) {
              const data = json.inventory || json.products;
              await db.inventory.clear();
              await db.inventory.bulkPut(data);
            }
            
            // Restore Sales
            if (json.sales) {
              await db.sales.clear();
              await db.sales.bulkPut(json.sales);
            }
            
            // Restore Expenses
            if (json.expenses) {
              await db.expenses.clear();
              await db.expenses.bulkPut(json.expenses);
            }
            
            // Optional: Restore Users (Only if explicitly in the backup)
            if (json.users) {
              await db.users.clear();
              await db.users.bulkPut(json.users);
            }

            // Optional: Restore Settings
            if (json.settings) {
              if (json.settings.shopName) localStorage.setItem('shop_name', json.settings.shopName);
              if (json.settings.shopInfo) localStorage.setItem('shop_info', json.settings.shopInfo);
            }
          });

          alert('Data Sync Complete! Refreshing...');
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
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Shop Admin</h1>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Configuration & Security</p>
      </header>

      {/* Staff Sync */}
      {isAdmin && (
        <section className="bg-emerald-950 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none">Staff Device Sync</h2>
              <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider mt-1">Connect new phones</p>
            </div>
          </div>
          <p className="text-xs font-medium opacity-80 leading-relaxed">
            Generate a secure Shop Key to set up this business on a staff member's device.
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
            {isGenerating ? 'Generating...' : 'Generate Setup Key'}
            {!isGenerating && <Share2 size={16} />}
          </button>
        </section>
      )}

      {/* Import Section - Redesigned for safety */}
      {isAdmin && (
        <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <FileJson size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none text-gray-800">Restore/Merge Data</h2>
              <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider mt-1">From Master Backup</p>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 leading-relaxed">
            Upload your backup JSON file to sync inventory and sales. This will update stock levels and sales history.
          </p>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileImport} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
          >
            {isImporting ? 'Processing Data...' : 'Select Backup File'}
            {!isImporting && <CheckCircle size={16} />}
          </button>
          <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
            <AlertCircle className="text-amber-500 flex-shrink-0" size={14} />
            <p className="text-[9px] text-amber-800 font-bold uppercase leading-normal">Note: If the backup contains user accounts, it may change your login PINs.</p>
          </div>
        </section>
      )}

      {/* Shop Identity */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Identity
        </h2>
        <div className="space-y-4">
          <input 
            disabled={!isAdmin}
            type="text" 
            placeholder="Business Name"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
          <input 
            disabled={!isAdmin}
            type="text" 
            placeholder="Address / Phone"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
            value={shopInfo}
            onChange={(e) => setShopInfo(e.target.value)}
          />
        </div>
      </section>

      {/* User Management */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Registered Staff
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
              <Plus size={14} /> Add Staff
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
          <CloudUpload size={14} /> Cloud Backup
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
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Export database file</p>
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
        <h3 className="text-lg font-black text-gray-800">NaijaShop POS Pro</h3>
        <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest">
          Offline-first architecture. <br/> Lagos, Nigeria.
        </p>
      </div>
    </div>
  );
};
