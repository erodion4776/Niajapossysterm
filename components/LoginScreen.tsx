import React, { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData, User } from '../db.ts';
import { decodeShopKey } from '../utils/whatsapp.ts';
import { User as UserIcon, Key, ArrowRight, Smartphone, ShieldCheck, X, RefreshCw, LogIn } from 'lucide-react';
import { DeviceRole } from '../types.ts';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  deviceRole: DeviceRole;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, deviceRole }) => {
  const users = useLiveQuery(() => db.users.toArray());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinArr, setPinArr] = useState(new Array(4).fill(''));
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isStaffDevice = deviceRole === 'StaffDevice';
  const shopName = localStorage.getItem('shop_name') || 'NaijaShop';

  // Filter users based on device type - STRICK LOCKDOWN
  const displayUsers = useMemo(() => {
    if (!users) return [];
    if (isStaffDevice) {
      // On a staff device, we ONLY show accounts with the 'Staff' role.
      // This prevents the Boss Admin account from ever appearing or being used on this terminal.
      return users.filter(u => u.role === 'Staff');
    }
    return users;
  }, [users, isStaffDevice]);

  const handleLogin = () => {
    const combinedPin = pinArr.join('');
    if (selectedUser && selectedUser.pin === combinedPin) {
      onLogin(selectedUser);
    } else {
      setError('Incorrect PIN');
      setPinArr(new Array(4).fill(''));
      pinRefs.current[0]?.focus();
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleInputChange = (val: string, index: number) => {
    if (!/^\d*$/.test(val)) return;
    const newArr = [...pinArr];
    newArr[index] = val.slice(-1);
    setPinArr(newArr);
    if (val && index < 3) pinRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !pinArr[index] && index > 0) pinRefs.current[index - 1]?.focus();
    if (e.key === 'Enter' && pinArr.join('').length === 4) handleLogin();
  };

  const handleImportKey = async () => {
    const data = decodeShopKey(importKey);
    if (!data) {
      setImportError('Invalid Key. Please check the code from Boss.');
      return;
    }

    // Handle Staff Invite (Remote Setup)
    if (data.type === 'STAFF_INVITE') {
      if (confirm(`Accept invite to join "${data.shopName}" as ${data.staffName}?`)) {
        setIsProcessing(true);
        try {
          // 1. Wipe everything to ensure no old Admin accounts or data remain
          await clearAllData();
          
          // 2. Setup the database for the specific staff member
          await db.transaction('rw', [db.inventory, db.users, db.settings], async () => {
            if (data.inventory.length > 0) await db.inventory.bulkAdd(data.inventory);
            
            // Add ONLY the staff user account provided in the key
            await db.users.add({
              name: data.staffName,
              pin: data.staffPin,
              role: 'Staff'
            });
            
            await db.settings.put({ key: 'is_activated', value: true });
          });
          
          // 3. Update device settings
          localStorage.setItem('shop_name', data.shopName);
          localStorage.setItem('shop_info', data.shopInfo);
          localStorage.setItem('is_activated', 'true');
          localStorage.setItem('device_role', 'StaffDevice');
          
          // 4. Reload to refresh the whole app state
          window.location.reload();
        } catch (e) {
          setImportError('Invite setup failed: ' + (e as Error).message);
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    // Handle Master Stock Update
    if (data.type === 'STOCK_UPDATE') {
      if (confirm(`Update stock levels from Admin? This will reset your current counts.`)) {
        setIsProcessing(true);
        try {
          await db.transaction('rw', [db.inventory], async () => {
            for (const item of data.inventory) {
              const existing = await db.inventory.where('name').equals(item.name).first();
              if (existing) {
                await db.inventory.update(existing.id!, { 
                  stock: item.stock, 
                  sellingPrice: item.sellingPrice,
                  costPrice: item.costPrice 
                });
              } else {
                const { id, ...rest } = item;
                await db.inventory.add(rest);
              }
            }
          });
          alert('Stock Synced Successfully!');
          setShowImport(false);
          setImportKey('');
        } catch (e) {
          setImportError('Stock sync failed');
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    // Handle Full Setup
    if (confirm(`Clone "${data.settings.shopName}" to this phone?`)) {
      setIsProcessing(true);
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
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (showImport) {
    return (
      <div className="fixed inset-0 z-[550] bg-white dark:bg-emerald-950 flex flex-col p-6 overflow-y-auto transition-colors duration-300">
        <button onClick={() => setShowImport(false)} className="self-end p-2 bg-slate-100 dark:bg-emerald-900 rounded-full mb-8 dark:text-emerald-50"><X size={20} /></button>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4"><RefreshCw size={32} className={isProcessing ? 'animate-spin' : ''} /></div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">System Setup</h2>
          <p className="text-slate-400 dark:text-emerald-500/40 text-sm mt-2 font-medium">Paste the Code sent by the Boss.</p>
        </div>
        <textarea 
          placeholder="Paste INVITE-STAFF-... code here" 
          className="w-full h-48 bg-slate-50 dark:bg-emerald-900/40 border border-slate-100 dark:border-emerald-800/40 rounded-3xl p-5 text-xs font-mono mb-6 resize-none dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none" 
          value={importKey} 
          onChange={(e) => setImportKey(e.target.value)} 
        />
        {importError && <p className="text-red-500 text-xs font-bold mb-4 text-center bg-red-50 p-3 rounded-xl">{importError}</p>}
        <button 
          onClick={handleImportKey} 
          disabled={isProcessing || !importKey}
          className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
        >
          {isProcessing ? 'Setting up Terminal...' : 'Activate Staff Account'} <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-emerald-950 flex flex-col items-center text-white overflow-y-auto overflow-x-hidden">
      <div className="w-full relative h-[320px] flex-shrink-0 flex items-center justify-center overflow-hidden">
        <img src="https://i.ibb.co/CK8Xt78C/IMG-20251222-212138.png" alt="NaijaShop" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>
        <div className="relative z-10 text-center px-8 mt-16 animate-in fade-in zoom-in duration-700">
          <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase drop-shadow-2xl text-white">
            {shopName}
          </h1>
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-400/30 inline-block shadow-lg">
            <p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.4em]">
              {isStaffDevice ? 'Staff Terminal' : 'Boss Terminal'}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm px-8 pb-16 flex flex-col items-center flex-1">
        {!selectedUser ? (
          <div className="w-full space-y-6 animate-in slide-in-from-bottom duration-500 flex flex-col items-center">
            <div className="text-center"><h2 className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.3em]">Identify Your Account</h2></div>
            <div className="grid grid-cols-1 gap-4 w-full">
              {displayUsers?.map(user => (
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
              
              {isStaffDevice && displayUsers.length === 0 && (
                <div className="text-center py-10 bg-emerald-900/20 rounded-[32px] border border-dashed border-emerald-800/40 w-full space-y-3">
                  <Smartphone className="mx-auto text-emerald-800" size={32} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Terminal Not Activated.<br/>Import Boss Key to begin.</p>
                </div>
              )}
            </div>
            
            <div className="w-full space-y-3 mt-4">
              <button onClick={() => setShowImport(true)} className="w-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-black py-5 rounded-[28px] text-[10px] uppercase tracking-[0.2em] shadow-inner flex items-center justify-center gap-2">
                <LogIn size={14} /> {isStaffDevice && displayUsers.length === 0 ? 'Activate with Boss Key' : 'Import Code / Sync'}
              </button>
              
              <button onClick={() => { if(confirm("This will completely reset the terminal. Continue?")) { localStorage.clear(); window.location.reload(); } }} className="w-full text-emerald-800 font-black text-[9px] uppercase tracking-[0.3em] py-2">
                Reset System
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8 animate-in slide-in-from-bottom duration-500 flex flex-col items-center">
            <button onClick={() => setSelectedUser(null)} className="self-start bg-emerald-900/40 p-3 rounded-2xl text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all"><X size={14} /> Back to Users</button>
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-2xl"><ShieldCheck size={40} /></div>
              <h2 className="text-2xl font-black">{selectedUser.name}</h2>
              <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Enter {selectedUser.role} PIN to Unlock</p>
            </div>
            <div className="space-y-6 flex flex-col items-center w-full">
              <div className="flex gap-2 justify-center w-full">
                {pinArr.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => pinRefs.current[idx] = el}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    className="w-[45px] h-[50px] bg-emerald-900/30 border border-emerald-800/60 rounded-xl text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-inner"
                    value={digit}
                    onChange={e => handleInputChange(e.target.value, idx)}
                    onKeyDown={e => handleKeyDown(e, idx)}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              <button onClick={handleLogin} className="w-full bg-white text-emerald-950 font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm">Unlock Terminal</button>
              {error && <p className="text-red-400 text-center font-black text-xs uppercase tracking-widest animate-bounce">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};