
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData } from '../db.ts';
import { decodeShopKey } from '../utils/whatsapp.ts';
import { User as UserIcon, Key, ArrowRight, Smartphone, ShieldCheck, X } from 'lucide-react';

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

  const handleImportKey = async () => {
    const data = decodeShopKey(importKey);
    if (!data) {
      setImportError('Invalid Shop Key.');
      return;
    }
    if (confirm(`Clone "${data.settings.shopName}" to this phone?`)) {
      try {
        await clearAllData();
        await db.transaction('rw', [db.inventory, db.users], async () => {
          if (data.inventory.length > 0) await db.inventory.bulkAdd(data.inventory.map(({id, ...rest}: any) => rest));
          if (data.users.length > 0) await db.users.bulkAdd(data.users.map(({id, ...rest}: any) => rest));
        });
        localStorage.setItem('shop_name', data.settings.shopName);
        localStorage.setItem('shop_info', data.settings.shopInfo);
        window.location.reload();
      } catch (e) {
        setImportError('Import failed');
      }
    }
  };

  if (showImport) {
    return (
      <div className="fixed inset-0 z-[550] bg-white flex flex-col p-6 overflow-y-auto">
        <button onClick={() => setShowImport(false)} className="self-end p-2 bg-gray-100 rounded-full mb-8"><X size={20} /></button>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"><Smartphone size={32} /></div>
          <h2 className="text-2xl font-black text-gray-800 uppercase">Staff Sync</h2>
          <p className="text-gray-400 text-sm mt-2">Paste the Setup Key from your Admin.</p>
        </div>
        <textarea placeholder="Paste SHOP-KEY-..." className="w-full h-48 bg-gray-50 border border-gray-100 rounded-3xl p-5 text-xs font-mono mb-6 resize-none" value={importKey} onChange={(e) => setImportKey(e.target.value)} />
        {importError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{importError}</p>}
        <button onClick={handleImportKey} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs">Sync Shop Data</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-emerald-950 flex flex-col items-center text-white overflow-y-auto">
      <div className="w-full relative h-[320px] flex-shrink-0 flex items-center justify-center overflow-hidden">
        <img src="https://i.ibb.co/CK8Xt78C/IMG-20251222-212138.png" alt="NaijaShop" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>
        <div className="relative z-10 text-center px-8 mt-16 animate-in fade-in zoom-in duration-700">
          <h1 className="text-5xl font-black tracking-tighter mb-2 uppercase drop-shadow-2xl text-white">NaijaShop</h1>
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-400/30 inline-block shadow-lg">
            <p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.4em]">Secure Terminal</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm px-8 pb-16 flex flex-col items-center flex-1">
        {!selectedUser ? (
          <div className="w-full space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="text-center"><h2 className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.3em]">Identify Your Account</h2></div>
            <div className="grid grid-cols-1 gap-4">
              {users?.map(user => (
                <button key={user.id} onClick={() => setSelectedUser(user)} className="bg-emerald-900/40 backdrop-blur-sm border border-emerald-800/50 p-6 rounded-[32px] flex items-center justify-between group active:scale-[0.97] transition-all shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-400 border border-emerald-400/20"><UserIcon size={24} /></div>
                    <div className="text-left">
                      <p className="font-black text-xl leading-none">{user.name}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1.5 tracking-widest">{user.role}</p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-emerald-700 group-hover:text-emerald-400 transition-colors" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowImport(true)} className="w-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-black py-5 rounded-[28px] text-[10px] uppercase tracking-[0.2em] mt-4 shadow-inner">
              New Staff Setup
            </button>
          </div>
        ) : (
          <div className="w-full space-y-8 animate-in slide-in-from-bottom duration-500">
            <button onClick={() => setSelectedUser(null)} className="bg-emerald-900/40 p-3 rounded-2xl text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all"><X size={14} /> Back to Users</button>
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-2xl"><ShieldCheck size={40} /></div>
              <h2 className="text-2xl font-black">{selectedUser.name}</h2>
              <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Enter PIN to Unlock</p>
            </div>
            <div className="space-y-6">
              <input 
                type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[32px] py-8 text-center text-4xl tracking-[0.6em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                value={pin} onChange={(e) => setPin(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && handleLogin()} autoFocus
              />
              <button onClick={handleLogin} className="w-full bg-white text-emerald-950 font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm">Unlock POS</button>
              {error && <p className="text-red-400 text-center font-black text-xs uppercase tracking-widest animate-bounce">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
