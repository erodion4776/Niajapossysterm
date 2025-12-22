
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData } from '../db';
import { decodeShopKey } from '../utils/whatsapp';
import { Lock, User as UserIcon, Key, ArrowRight, Smartphone, ShieldCheck, X } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const users = useLiveQuery(() => db.users.toArray());
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');

  const handleLogin = () => {
    if (selectedUser && selectedUser.pin === pin) {
      onLogin(selectedUser);
    } else {
      setError('Incorrect PIN');
      setPin('');
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleImport = async () => {
    const data = decodeShopKey(importKey);
    if (!data) {
      setImportError('Invalid Shop Key. Please check the text and try again.');
      return;
    }

    if (confirm(`This will set up "${data.settings.shopName}" on this phone. Existing local data will be deleted. Continue?`)) {
      try {
        await clearAllData();
        
        // Import Data
        await db.transaction('rw', [db.inventory, db.users], async () => {
          if (data.inventory.length > 0) {
            await db.inventory.bulkAdd(data.inventory.map(({id, ...rest}: any) => rest));
          }
          if (data.users.length > 0) {
            await db.users.bulkAdd(data.users.map(({id, ...rest}: any) => rest));
          }
        });

        localStorage.setItem('shop_name', data.settings.shopName);
        localStorage.setItem('shop_info', data.settings.shopInfo);
        
        setShowImport(false);
        setImportKey('');
        alert('Setup Complete! You can now log in.');
      } catch (e) {
        setImportError('Import failed: ' + (e as Error).message);
      }
    }
  };

  if (showImport) {
    return (
      <div className="fixed inset-0 z-[150] bg-white flex flex-col p-6 overflow-y-auto">
        <button onClick={() => setShowImport(false)} className="self-end p-2 bg-gray-100 rounded-full mb-8">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-800">Staff Setup</h2>
          <p className="text-gray-400 text-sm mt-2">Paste the Shop Key sent to you on WhatsApp by your Admin.</p>
        </div>

        <textarea 
          placeholder="Paste SHOP-KEY-..."
          className="w-full h-48 bg-gray-50 border border-gray-100 rounded-3xl p-5 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-6 resize-none"
          value={importKey}
          onChange={(e) => setImportKey(e.target.value)}
        />

        {importError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{importError}</p>}

        <button 
          onClick={handleImport}
          className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Activate Shop <ArrowRight size={20} />
        </button>

        <div className="mt-auto pt-8 flex items-center justify-center gap-2 text-gray-300 text-[10px] font-bold uppercase">
          <ShieldCheck size={14} />
          <span>Local Data Only • 100% Offline</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-emerald-950 flex flex-col items-center p-8 text-white overflow-y-auto">
      <div className="mt-12 text-center mb-12">
        <h1 className="text-4xl font-black tracking-tighter mb-2">NaijaShop</h1>
        <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.2em]">Inventory & POS Manager</p>
      </div>

      {!selectedUser ? (
        <div className="w-full space-y-4">
          <p className="text-center text-emerald-100/50 text-xs font-bold uppercase mb-6 tracking-widest">Select Your Name</p>
          <div className="grid grid-cols-1 gap-3">
            {users?.map(user => (
              <button 
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="bg-emerald-900/40 border border-emerald-800 p-5 rounded-3xl flex items-center justify-between group active:bg-emerald-800 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-400">
                    <UserIcon size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-lg">{user.name}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">{user.role}</p>
                  </div>
                </div>
                <ArrowRight className="text-emerald-700 group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xs animate-slide-up">
          <button onClick={() => setSelectedUser(null)} className="text-emerald-500 text-xs font-bold uppercase mb-8 flex items-center gap-2">
            <X size={14} /> Back to Users
          </button>
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-black">Welcome, {selectedUser.name}</h2>
            <p className="text-emerald-500/60 text-xs mt-1">Enter your 4-digit PIN</p>
          </div>

          <div className="space-y-6">
            <input 
              type="password" 
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              className="w-full bg-emerald-900/50 border border-emerald-800 rounded-2xl py-6 text-center text-4xl tracking-[1em] font-black focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all placeholder:text-emerald-900/50"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            {error && <p className="text-red-400 text-center font-bold text-sm animate-bounce">{error}</p>}
            <button 
              onClick={handleLogin}
              className="w-full bg-emerald-500 text-emerald-950 font-black py-5 rounded-2xl shadow-xl shadow-emerald-900/40 active:scale-95 transition-all"
            >
              Unlock App
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => setShowImport(true)}
        className="mt-auto pt-12 pb-6 text-emerald-500/50 text-xs font-bold uppercase tracking-widest hover:text-emerald-400 transition-colors flex items-center gap-2"
      >
        <Key size={14} /> I am a Staff (Import Setup Key)
      </button>
    </div>
  );
};
