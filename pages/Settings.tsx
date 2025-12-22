
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { CloudUpload, User as UserIcon, ShieldCheck, Info, Heart, Lock, Key, Store, MapPin, Smartphone, Plus, Trash2, AlertCircle, FileJson, CheckCircle } from 'lucide-react';
import { Role } from '../types.ts';

interface SettingsProps {
  role: Role;
  setRole: (role: Role) => void;
}

export const Settings: React.FC<SettingsProps> = ({ role, setRole }) => {
  const isAdmin = role === 'Admin';
  const isPaid = localStorage.getItem('is_paid') === 'true';
  const [shopName, setShopName] = useState(() => localStorage.getItem('shop_name') || '');
  const [shopInfo, setShopInfo] = useState(() => localStorage.getItem('shop_info') || '');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'Staff' as Role });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const users = useLiveQuery(() => db.users.toArray());
  const hasStaff = users?.some(u => u.role === 'Staff');

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

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm('Importing this file will overwrite existing data. Proceed?')) {
          setIsImporting(true);
          await clearAllData();

          await db.transaction('rw', [db.inventory, db.users, db.sales, db.expenses, db.stockLogs], async () => {
            // 1. Map Products to Inventory
            if (json.products) {
              await db.inventory.bulkAdd(json.products.map((p: any) => ({
                id: p.id,
                name: p.name,
                costPrice: p.cost || 0,
                sellingPrice: p.price || 0,
                stock: p.stock || 0,
                category: 'General',
                dateAdded: p.dateAdded
              })));
            }

            // 2. Map Users
            if (json.users) {
              await db.users.bulkAdd(json.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                pin: '0000', // Default PIN for imported users
                role: (u.role === 'admin' ? 'Admin' : 'Staff') as Role,
                email: u.email
              })));
            }

            // 3. Map Sales (Converting flat list to grouped structure)
            if (json.sales) {
              await db.sales.bulkAdd(json.sales.map((s: any) => ({
                id: s.id,
                timestamp: new Date(s.date).getTime(),
                total: s.totalPrice,
                totalCost: 0, // Costs would require a lookup, set to 0 to avoid errors
                items: [{
                  id: s.productId,
                  name: s.productName,
                  price: s.totalPrice / s.quantity,
                  costPrice: 0,
                  quantity: s.quantity
                }],
                staff_id: 'System',
                staff_name: 'Imported',
                paymentMethod: s.paymentMethod || 'cash'
              })));
            }

            // 4. Map Expenses
            if (json.expenses) {
              await db.expenses.bulkAdd(json.expenses.map((e: any) => ({
                ...e,
                date: new Date(e.date).getTime()
              })));
            }

            // 5. Map Stock Logs
            if (json.stockLogs) {
              await db.stockLogs.bulkAdd(json.stockLogs.map((l: any) => ({
                ...l,
                date: new Date(l.date).getTime()
              })));
            }
          });
          
          alert('Database Restored! Your products and history are now live.');
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

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    await generateShopKey();
    setIsGenerating(false);
  };

  const deleteUser = async (id: number | string) => {
    if (confirm('Delete this user?')) {
      await db.users.delete(id);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin & Security</h1>
      </header>

      {/* Import Section - Custom UI for your JSON file */}
      <section className="bg-emerald-600 p-6 rounded-[32px] shadow-xl text-white space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <FileJson size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black leading-none">Import Your Data</h2>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mt-1">Products, Sales & Expenses</p>
          </div>
        </div>
        
        <p className="text-xs font-medium opacity-80 leading-relaxed">
          Upload your JSON file to instantly sync your stock of Heineken, Stout, Goldberg and other products along with your historical sales.
        </p>

        <input 
          type="file" 
          accept=".json" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileImport}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
        >
          {isImporting ? 'Syncing...' : 'Select JSON File'}
          {!isImporting && <CheckCircle size={16} />}
        </button>
      </section>

      {/* Shop Identity Section */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Business Identity
        </h2>
        <div className="space-y-4">
          <div className="relative">
            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              disabled={!isAdmin}
              type="text" 
              placeholder="Shop Name"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              disabled={!isAdmin}
              type="text" 
              placeholder="Address / Phone"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900"
              value={shopInfo}
              onChange={(e) => setShopInfo(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* User Management Section */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> Active Staff
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
              <Plus size={14} /> New User
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

      {/* Backup Section */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Mobile Backup
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
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Export current shop data</p>
            </div>
          </div>
        </button>
      </section>

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
