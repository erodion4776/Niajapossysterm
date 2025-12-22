import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { backupToWhatsApp, generateShopKey } from '../utils/whatsapp.ts';
import { CloudUpload, User as UserIcon, ShieldCheck, Info, Heart, Lock, Key, Store, MapPin, Smartphone, Plus, Trash2, AlertCircle } from 'lucide-react';
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
    backupToWhatsApp({ inventory, sales, timestamp: Date.now() });
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    await generateShopKey();
    setIsGenerating(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.pin.length === 4) {
      await db.users.add(newUser);
      setNewUser({ name: '', pin: '', role: 'Staff' });
      setShowAddUser(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (confirm('Delete this user?')) {
      await db.users.delete(id);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin & Security</h1>
      </header>

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
              placeholder="Shop Name (e.g. Kola's Supermarket)"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900 disabled:opacity-50 placeholder:text-gray-400"
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
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm text-gray-900 disabled:opacity-50 placeholder:text-gray-400"
              value={shopInfo}
              onChange={(e) => setShopInfo(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Staff Key Export */}
      {isAdmin && (
        <section className="bg-emerald-600 p-6 rounded-3xl shadow-lg space-y-5 text-white">
          <div>
            <h2 className="text-xs font-black text-emerald-200 uppercase tracking-widest flex items-center gap-2">
              <Smartphone size={14} /> Staff Setup
            </h2>
            <p className="text-sm font-medium mt-2 leading-relaxed">
              {hasStaff 
                ? "Send a setup key to a staff's phone to sync inventory and user logins via WhatsApp."
                : "You must add at least one Staff member below before you can generate a Setup Key."}
            </p>
          </div>
          
          {hasStaff ? (
            <button 
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-70"
            >
              {isGenerating ? 'Processing...' : 'Generate Staff Setup Key'}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-700/50 p-3 rounded-xl text-emerald-100 text-xs font-bold uppercase tracking-tight">
              <AlertCircle size={16} />
              <span>No Staff members found</span>
            </div>
          )}
        </section>
      )}

      {/* User Management Section */}
      <section className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={14} /> User Management
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddUser(true)} className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
              <Plus size={14} /> Add User
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {users?.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  <UserIcon size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm leading-none">{u.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Role: {u.role} • PIN: {u.pin}</p>
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

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-gray-900">New User PIN</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input 
                required
                placeholder="Full Name"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900 placeholder:text-gray-400"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
              />
              <input 
                required
                placeholder="4-Digit PIN"
                maxLength={4}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-center tracking-[1em] text-gray-900 placeholder:text-gray-400"
                value={newUser.pin}
                onChange={e => setNewUser({...newUser, pin: e.target.value})}
              />
              <select 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-gray-900"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
              >
                <option value="Staff" className="text-gray-900">Staff (POS Only)</option>
                <option value="Admin" className="text-gray-900">Admin (Full Access)</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-xs">Cancel</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security & Backup Sections */}
      <section className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm space-y-5">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Lock size={14} /> Activation Status
        </h2>
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
          <div className={`p-3 rounded-2xl ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {isPaid ? <ShieldCheck size={20} /> : <Info size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-black text-gray-800">{isPaid ? 'Premium Unlocked' : 'Trial Version'}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">{isPaid ? 'Full features enabled forever' : 'Ends in 3 days'}</p>
          </div>
        </div>
      </section>

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
              <p className="font-black text-lg leading-none">Sync to Cloud</p>
              <p className="text-[10px] font-bold uppercase opacity-60 mt-1">Export database via WhatsApp</p>
            </div>
          </div>
          <ShieldCheck size={20} className="text-emerald-300" />
        </button>
      </section>

      <div className="bg-gray-100 p-8 rounded-[40px] text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
          <Info className="text-gray-300" size={28} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-800">NaijaShop POS Pro</h3>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-2">
            Built with <Heart size={14} className="text-red-500 fill-red-500" /> in Lagos
          </p>
        </div>
        <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[200px] mx-auto">
          Offline-first architecture. 
          Your business data never leaves this device.
        </p>
      </div>
    </div>
  );
};
