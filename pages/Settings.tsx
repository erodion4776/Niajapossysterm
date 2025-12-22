
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
            // Map Products to Inventory
            if (json.products) {
              await db.inventory.bulkAdd(json.products.map((p: any) => ({
                id: p.id,
                name: p.name,
                costPrice: p.cost || 0,
                sellingPrice: p.price || 0,
                stock: p.stock || 0,
                category: 'Imported',
                dateAdded: p.dateAdded
              })));
            }

            // Users
            if (json.users) {
              await db.users.bulkAdd(json.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                pin: u.pin || '1234',
                role: (u.role === 'admin' ? 'Admin' : 'Staff') as Role,
                email: u.email
              })));
            }

            // Sales (Group by date to fit app structure or store flat)
            // Note: Current app expects grouped items, but JSON is flat. 
            // We'll store flat for now or convert.
            if (json.sales) {
              await db.sales.bulkAdd(json.sales.map((s: any) => ({
                id: s.id,
                timestamp: new Date(s.date).getTime(),
                total: s.totalPrice,
                totalCost: 0, // Cost not provided in flat sale JSON, would need product lookup
                items: [{
                  id: s.productId,
                  name: s.productName,
                  price: s.totalPrice / s.quantity,
                  costPrice: 0,
                  quantity: s.quantity
                }],
                staff_id: 'Imported',
                staff_name: 'Imported',
                paymentMethod: s.paymentMethod
              })));
            }

            // Expenses
            if (json.expenses) {
              await db.expenses.bulkAdd(json.expenses);
            }

            // Stock Logs
            if (json.stockLogs) {
              await db.stockLogs.bulkAdd(json.stockLogs);
            }
          });
          
          alert('Import successful! Data is restored.');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to import: ' + (err as Error).message);
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

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin & Security</h1>
      </header>

      {/* Import Section */}
      <section className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl shadow-sm space-y-4">
        <h2 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
          <FileJson size={14} /> Data Restore
        </h2>
        <p className="text-xs text-emerald-800/70 font-medium">Use this to import your existing JSON project data (Products, Sales, Expenses).</p>
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
          className="w-full bg-white text-emerald-700 font-bold py-4 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {isImporting ? 'Processing Data...' : 'Upload JSON Backup'}
          <CheckCircle size={18} />
        </button>
      </section>

      {/* Shop Identity Section */}
      <section className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Identity
        </h2>
        <div className="space-y-4">
          <div className="relative">
            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              disabled={!isAdmin}
              type="text" 
              placeholder="Shop Name"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900 placeholder:text-gray-400"
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
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900 placeholder:text-gray-400"
              value={shopInfo}
              onChange={(e) => setShopInfo(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Existing Settings content... */}
      <section className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Cloud Backup
        </h2>
        <button 
          onClick={handleBackup}
          className="w-full flex items-center justify-between p-5 bg-emerald-50 text-emerald-700 rounded-2xl active:scale-[0.98] transition-all border border-emerald-100 group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600 group-active:scale-90 transition-transform">
              <CloudUpload size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-lg leading-none">WhatsApp Backup</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Export current database</p>
            </div>
          </div>
        </button>
      </section>
    </div>
  );
};
