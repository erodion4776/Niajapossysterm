
import React, { useEffect, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { 
  CloudUpload, User as UserIcon, Store, Smartphone, Plus, Trash2, 
  FileJson, CheckCircle, Share2, RefreshCw, ShieldCheck, Database, History 
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
        
        // SUPPORT USER'S SPECIFIC JSON FORMAT
        const productsData = json.products || json.inventory || json.items || [];
        const salesData = json.sales || [];
        
        if (productsData.length === 0 && salesData.length === 0) {
          alert('No compatible data found in this JSON file.');
          return;
        }

        const confirmMsg = `Found ${productsData.length} products and ${salesData.length} sales. This will MERGE them into your current shop. Your Admin login and Staff list will remain UNTOUCHED. Continue?`;

        if (confirm(confirmMsg)) {
          setIsImporting(true);
          
          let updatedProducts = 0;
          let addedProducts = 0;
          let addedSales = 0;

          await db.transaction('rw', [db.inventory, db.sales], async () => {
            const currentInventory = await db.inventory.toArray();
            
            // 1. Process Products
            for (const item of productsData) {
              const name = item.name || item.Name || "";
              const sellingPrice = Number(item.price || item.sellingPrice || 0);
              const costPrice = Number(item.cost || item.costPrice || 0);
              const stock = Number(item.stock || 0);
              const category = item.category || 'General';

              if (!name) continue;

              const existing = currentInventory.find(i => 
                i.name.trim().toLowerCase() === name.trim().toLowerCase()
              );

              if (existing) {
                await db.inventory.update(existing.id!, {
                  stock: stock,
                  sellingPrice: sellingPrice || existing.sellingPrice,
                  costPrice: costPrice || existing.costPrice,
                  category
                });
                updatedProducts++;
              } else {
                await db.inventory.add({
                  name,
                  stock,
                  sellingPrice,
                  costPrice,
                  category,
                  dateAdded: item.dateAdded || new Date().toISOString()
                });
                addedProducts++;
              }
            }

            // 2. Process Sales (Conversion Layer)
            for (const sale of salesData) {
              // Convert user's flat sale to app's nested format if needed
              const timestamp = new Date(sale.date || sale.timestamp).getTime();
              
              // Only import if not already existing (basic check by timestamp)
              const exists = await db.sales.where('timestamp').equals(timestamp).count();
              if (exists === 0) {
                // Fix: Removed non-existent property 'paymentMethod' to strictly adhere to the Sale interface
                await db.sales.add({
                  items: [{
                    id: sale.productId || `import-${Date.now()}`,
                    name: sale.productName || 'Unknown Product',
                    price: sale.totalPrice / (sale.quantity || 1),
                    costPrice: 0, // Cost usually not in flat sales export
                    quantity: sale.quantity || 1
                  }],
                  total: sale.totalPrice || 0,
                  totalCost: 0,
                  timestamp,
                  staff_id: 'Imported',
                  staff_name: 'System Import'
                });
                addedSales++;
              }
            }
          });

          alert(`✅ Import Success!\n\nProducts: ${updatedProducts} updated, ${addedProducts} added.\nSales: ${addedSales} records imported.\n\nYour profile is safe.`);
          window.location.reload();
        }
      } catch (err) {
        alert('❌ Error: ' + (err as Error).message);
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
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin</h1>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Shop Management</p>
      </header>

      {/* Stock Importer - SAFE VERSION */}
      {isAdmin && (
        <section className="bg-emerald-600 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <RefreshCw size={24} className={isImporting ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none">Smart Data Merge</h2>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mt-1">Import Stock & History</p>
            </div>
          </div>
          <p className="text-xs font-medium opacity-90 leading-relaxed">
            Upload your <b>JSON</b> file. We'll update your prices and stock levels. This will <b>NOT</b> affect your login or staff accounts.
          </p>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleSmartImport} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
          >
            {isImporting ? 'Syncing...' : 'Select JSON File'}
            {!isImporting && <Database size={16} />}
          </button>
          <div className="flex items-center gap-2 bg-emerald-700/30 p-3 rounded-xl">
            <ShieldCheck size={14} className="text-emerald-300" />
            <p className="text-[9px] font-bold uppercase tracking-wider">Zero-Reset: Staff logins are protected.</p>
          </div>
        </section>
      )}

      {/* Device Cloning */}
      {isAdmin && (
        <section className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none">Clone to Staff</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Remote Access</p>
            </div>
          </div>
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

      {/* User Management */}
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
                <button onClick={() => u.id && deleteUser(u.id)} className="text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Shop Info */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Store size={14} /> Shop Information
        </h2>
        <div className="space-y-4">
          <input 
            disabled={!isAdmin}
            type="text" 
            placeholder="Business Name"
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
          <input 
            disabled={!isAdmin}
            type="text" 
            placeholder="Address / Phone"
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
            value={shopInfo}
            onChange={(e) => setShopInfo(e.target.value)}
          />
        </div>
      </section>

      {/* WhatsApp Backup */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <CloudUpload size={14} /> Full Export
        </h2>
        <button 
          onClick={handleBackup}
          className="w-full flex items-center justify-between p-5 bg-emerald-50 text-emerald-700 rounded-2xl active:scale-95 transition-all border border-emerald-100"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600">
              <CloudUpload size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-lg leading-none">WhatsApp Backup</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Export everything</p>
            </div>
          </div>
        </button>
      </section>

      {/* User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Register Staff</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input required placeholder="Staff Name" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input required placeholder="4-Digit PIN" maxLength={4} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-center tracking-[1em]" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} />
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
