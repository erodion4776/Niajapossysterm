
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData, User } from '../db.ts';
import { decodeShopKey } from '../utils/whatsapp.ts';
import { getRequestCode, verifyResetKey } from '../utils/security.ts';
import { 
  User as UserIcon, Key, ArrowRight, Smartphone, 
  ShieldCheck, X, RefreshCw, LogIn, AlertCircle, 
  MessageCircle, Copy, Check, ShieldAlert
} from 'lucide-react';
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
  
  // Recovery States
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [resetKeyInput, setResetKeyInput] = useState('');
  const [requestCode, setRequestCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isStaffDevice = deviceRole === 'StaffDevice' || localStorage.getItem('user_role') === 'staff';
  const shopName = localStorage.getItem('shop_name') || 'NaijaShop';

  useEffect(() => {
    if (showForgotPin) {
      getRequestCode().then(setRequestCode);
    }
  }, [showForgotPin]);

  const displayUsers = useMemo(() => {
    if (!users) return [];
    if (isStaffDevice) {
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(requestCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleResetPin = async () => {
    setRecoveryError('');
    const isValid = await verifyResetKey(requestCode, resetKeyInput);
    
    if (isValid) {
      try {
        const admin = await db.users.where('role').equals('Admin').first();
        if (admin && admin.id) {
          await db.users.update(admin.id, { pin: "" });
        }
        localStorage.setItem('is_setup_pending', 'true');
        window.location.reload();
      } catch (err) {
        setRecoveryError('System error during reset.');
      }
    } else {
      setRecoveryError('Invalid Reset Key. Please try again.');
      setTimeout(() => setRecoveryError(''), 3000);
    }
  };

  const processStaffInvite = async (data: any) => {
    setIsProcessing(true);
    try {
      await db.users.clear();
      await db.users.add({ 
        name: data.staffName, 
        pin: data.staffPin, 
        role: 'Staff' 
      });

      await db.settings.put({ key: 'is_activated', value: true });
      if (data.expiry && data.license_signature) {
        await db.security.put({ key: 'license_expiry', value: data.expiry });
        await db.security.put({ key: 'license_signature', value: data.license_signature });
        localStorage.setItem('license_expiry', data.expiry);
        localStorage.setItem('license_signature', data.license_signature);
      }

      if (data.softPosBank) await db.settings.put({ key: 'softPosBank', value: data.softPosBank });
      if (data.softPosNumber) await db.settings.put({ key: 'softPosNumber', value: data.softPosNumber });
      if (data.softPosAccount) await db.settings.put({ key: 'softPosAccount', value: data.softPosAccount });

      localStorage.setItem('shop_name', data.shopName);
      localStorage.setItem('is_activated', 'true');
      localStorage.setItem('is_setup_pending', 'false');
      localStorage.setItem('device_role', 'StaffDevice');
      localStorage.setItem('user_role', 'staff');

      window.location.href = '/app';
    } catch (err) {
      setImportError('❌ Activation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportKey = async () => {
    let data;
    try {
      data = decodeShopKey(importKey);
    } catch (err) {
      setImportError('❌ Invalid Key format. Check code and try again.');
      return;
    }

    if (!data) {
      setImportError('❌ Invalid Invite Key. Please ask your Boss to send a new one.');
      return;
    }

    if (data.type === 'STAFF_INVITE' && data.secret === 'NAIJA_VERIFIED') {
      if (confirm(`Activate terminal for ${data.staffName} at "${data.shopName}"?`)) {
        await processStaffInvite(data);
      }
      return;
    }

    if (data.type === 'STOCK_UPDATE') {
      if (confirm(`Update stock levels and bank details from Admin?`)) {
        setIsProcessing(true);
        try {
          await db.transaction('rw', [db.inventory, db.settings], async () => {
            if (data.softPosBank !== undefined) await db.settings.put({ key: 'softPosBank', value: data.softPosBank });
            if (data.softPosNumber !== undefined) await db.settings.put({ key: 'softPosNumber', value: data.softPosNumber });
            if (data.softPosAccount !== undefined) await db.settings.put({ key: 'softPosAccount', value: data.softPosAccount });

            for (const item of data.inventory) {
              const existing = await db.inventory.where('name').equals(item.name).first();
              if (existing) {
                await db.inventory.update(existing.id!, { 
                  stock: item.stock, 
                  sellingPrice: item.sellingPrice,
                  costPrice: item.costPrice,
                  image: item.image 
                });
              } else {
                const { id, ...rest } = item;
                await db.inventory.add(rest);
              }
            }
          });
          alert('Sync Successful!');
          setShowImport(false);
          setImportKey('');
        } catch (e) {
          setImportError('Sync failed');
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    if (data.settings && data.settings.shopName) {
      if (confirm(`Clone "${data.settings.shopName}" to this phone?`)) {
        setIsProcessing(true);
        try {
          await clearAllData();
          await db.transaction('rw', [db.inventory, db.users, db.security], async () => {
            if (data.inventory.length > 0) await db.inventory.bulkAdd(data.inventory.map(({id, ...rest}: any) => rest));
            if (data.users.length > 0) await db.users.bulkAdd(data.users.map(({id, ...rest}: any) => rest));
            
            if (data.settings.license_expiry && data.settings.license_signature) {
               await db.security.put({ key: 'license_expiry', value: data.settings.license_expiry });
               await db.security.put({ key: 'license_signature', value: data.settings.license_signature });
               localStorage.setItem('license_expiry', data.settings.license_expiry);
               localStorage.setItem('license_signature', data.settings.license_signature);
            }
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
    }
  };

  if (showImport) {
    return (
      <div className="fixed inset-0 z-[550] bg-white dark:bg-emerald-950 flex flex-col p-6 overflow-y-auto transition-colors duration-300">
        <button onClick={() => setShowImport(false)} className="self-end p-2 bg-slate-100 dark:bg-emerald-900 rounded-full mb-8 dark:text-emerald-50"><X size={20} /></button>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4"><RefreshCw size={32} className={isProcessing ? 'animate-spin' : ''} /></div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tight">System Activation</h2>
          <p className="text-slate-400 dark:text-emerald-500/40 text-sm mt-2 font-medium">Paste the Code sent by the Boss.</p>
        </div>
        <textarea 
          placeholder="Paste STAFF-INVITE-... code here" 
          className={`w-full h-48 bg-slate-50 dark:bg-emerald-900/40 border ${importError ? 'border-red-500' : 'border-slate-100 dark:border-emerald-800/40'} rounded-3xl p-5 text-xs font-mono mb-6 resize-none dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none`} 
          value={importKey} 
          onChange={(e) => { setImportKey(e.target.value); setImportError(''); }} 
        />
        {importError && (
          <div className="flex items-center gap-2 text-red-500 text-xs font-bold mb-4 bg-red-50 p-3 rounded-xl animate-in shake duration-300">
             <AlertCircle size={14} />
             <p>{importError}</p>
          </div>
        )}
        <button 
          onClick={handleImportKey} 
          disabled={isProcessing || !importKey}
          className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? 'Setting up Terminal...' : 'Activate Terminal'} <ArrowRight size={16} />
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
            <div className="text-center">
              <h2 className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.3em]">Identify Your Account</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4 w-full">
              {displayUsers?.length > 0 ? (
                displayUsers.map(user => (
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
                ))
              ) : (
                <div className="text-center py-10 bg-emerald-900/20 rounded-[32px] border border-dashed border-emerald-800/40 w-full space-y-4 px-6">
                  <Smartphone className="mx-auto text-emerald-800" size={32} />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 leading-relaxed">
                    New Terminal Found.<br/>Import Boss Key or Sync to start.
                  </p>
                </div>
              )}
            </div>
            
            <div className="w-full space-y-3 mt-4">
              <button onClick={() => setShowImport(true)} className="w-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-black py-5 rounded-[28px] text-[10px] uppercase tracking-[0.2em] shadow-inner flex items-center justify-center gap-2 active:scale-95 transition-all">
                <RefreshCw size={14} /> Import Code / Sync
              </button>
              
              <button onClick={() => { if(confirm("This will completely reset the terminal. Continue?")) { localStorage.clear(); window.location.reload(); } }} className="w-full text-emerald-800 font-black text-[9px] uppercase tracking-[0.3em] py-2 hover:text-red-400 transition-colors">
                System Reset
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
                    ref={el => { pinRefs.current[idx] = el; }}
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
              
              {selectedUser.role === 'Admin' && (
                <button 
                  onClick={() => setShowForgotPin(true)}
                  className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mt-2 hover:text-emerald-500 transition-colors"
                >
                  Forgot Admin PIN?
                </button>
              )}

              {error && <p className="text-red-400 text-center font-black text-xs uppercase tracking-widest animate-bounce">{error}</p>}
            </div>
          </div>
        )}
      </div>

      {showForgotPin && (
        <div className="fixed inset-0 z-[550] bg-emerald-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl text-emerald-950 relative flex flex-col max-h-[90vh] overflow-hidden">
              <button onClick={() => setShowForgotPin(false)} className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 active:scale-90 z-10">
                <X size={18} />
              </button>
              
              <div className="overflow-y-auto p-6 pb-10 space-y-4 custom-scrollbar">
                <div className="text-center space-y-2">
                   <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                     <ShieldAlert size={24} />
                   </div>
                   <h2 className="text-xl font-black uppercase italic tracking-tighter">PIN Recovery</h2>
                   <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">Reset your admin access offline.</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-[24px] space-y-1 text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Your Request Code</p>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-mono font-black tracking-widest text-emerald-600">{requestCode}</span>
                      <button onClick={handleCopyCode} className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 active:scale-90">
                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-300" />}
                      </button>
                   </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl flex gap-2.5 items-start border border-amber-100">
                   <MessageCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-[11px] font-bold text-amber-800 leading-tight uppercase">
                     To reset your PIN, send this Request Code to Support on WhatsApp. A technical reset fee may apply.
                   </p>
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Enter Reset Key</label>
                   <input 
                     type="text" 
                     placeholder="8-CHAR KEY"
                     maxLength={8}
                     className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-black text-center text-base tracking-[0.2em] outline-none focus:ring-4 focus:ring-emerald-500/10 uppercase"
                     value={resetKeyInput}
                     onChange={(e) => setResetKeyInput(e.target.value)}
                   />
                </div>

                <button 
                  onClick={handleResetPin}
                  disabled={resetKeyInput.length < 8}
                  className="w-full bg-emerald-600 text-white font-black py-4 rounded-[24px] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Key size={16} /> Verify & Reset
                </button>

                {recoveryError && (
                   <p className="text-center text-[10px] font-black text-red-500 uppercase animate-bounce">{recoveryError}</p>
                )}
              </div>
           </div>

           <a 
            href={`https://wa.me/2347062228026?text=I%20forgot%20my%20Admin%20PIN.%20Request%20Code:%20${requestCode}`}
            target="_blank"
            className="mt-6 flex items-center gap-2 text-emerald-400 font-black uppercase text-[10px] tracking-widest"
           >
             <MessageCircle size={14} /> Chat with Support
           </a>
        </div>
      )}
    </div>
  );
};
