
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllData, User } from '../db.ts';
import { decodeShopKey } from '../utils/whatsapp.ts';
import { getRequestCode, verifyResetKey } from '../utils/security.ts';
import { 
  User as UserIcon, Key, ArrowRight, Smartphone, 
  ShieldCheck, X, RefreshCw, AlertCircle, MessageCircle, Copy, Check, ShieldAlert, UserCircle,
  Lock, HelpCircle, ChevronRight, Loader2
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
  
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [resetKeyInput, setResetKeyInput] = useState('');
  const [requestCode, setRequestCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [isVerifyingReset, setIsVerifyingReset] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isStaffDevice = deviceRole === 'StaffDevice' || localStorage.getItem('user_role') === 'staff';
  const shopName = localStorage.getItem('shop_name') || 'NaijaShop';

  useEffect(() => {
    if (showForgotPin) getRequestCode().then(setRequestCode);
  }, [showForgotPin]);

  const displayUsers = useMemo(() => {
    if (!users) return [];
    return isStaffDevice ? users.filter(u => u.role === 'Staff') : users;
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

  const copyRequestCode = () => {
    navigator.clipboard.writeText(requestCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleResetVerification = async () => {
    if (!resetKeyInput || isVerifyingReset) return;
    setIsVerifyingReset(true);
    setRecoveryError('');

    try {
      const isValid = await verifyResetKey(requestCode, resetKeyInput);
      if (isValid) {
        // 1. Wipe Admin PIN from DB (set to empty string for re-setup)
        await db.users.where('role').equals('Admin').modify({ pin: '' });
        
        // 2. Set Setup State to Pending to force Setup Wizard
        localStorage.setItem('is_setup_pending', 'true');
        
        // 3. Clear existing session if any
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('temp_otp');
        
        // 4. Force Redirect to /app for a clean switchboard check
        alert("✅ Security Reset Verified! You will now be taken to set your new private PIN.");
        window.location.href = '/app';
      } else {
        setRecoveryError('Invalid Reset Key. Please contact support.');
      }
    } catch (err) {
      setRecoveryError('System error during verification.');
    } finally {
      setIsVerifyingReset(false);
    }
  };

  if (showImport) {
    return (
      <div className="fixed inset-0 z-[550] bg-white dark:bg-emerald-950 flex flex-col p-6 overflow-y-auto">
        <button onClick={() => setShowImport(false)} className="self-end p-2 bg-slate-100 dark:bg-emerald-900 rounded-full mb-8"><X size={20} /></button>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4"><RefreshCw size={32} className={isProcessing ? 'animate-spin' : ''} /></div>
          <h2 className="text-2xl font-black uppercase">Terminal Activation</h2>
        </div>
        <textarea placeholder="Paste STAFF-INVITE code here" className="w-full h-48 bg-slate-50 border rounded-3xl p-5 text-xs font-mono mb-6" value={importKey} onChange={(e) => setImportKey(e.target.value)} />
        <button onClick={() => {}} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest">Activate Terminal</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-emerald-950 flex flex-col items-center text-white overflow-y-auto">
      <div className="w-full relative h-[280px] flex-shrink-0 flex items-center justify-center">
        <img src="https://i.ibb.co/CK8Xt78C/IMG-20251222-212138.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-black uppercase tracking-tighter">{shopName}</h1>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">{isStaffDevice ? 'Staff Terminal' : 'Boss Terminal'}</p>
        </div>
      </div>

      <div className="w-full max-w-sm px-8 pb-16 flex-1 flex flex-col items-center justify-center">
        {!selectedUser ? (
          <div className="w-full space-y-4 animate-in slide-in-from-bottom duration-500">
            <h2 className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.3em] text-center mb-6">Identify Your Account</h2>
            {displayUsers.map(user => (
              <button key={user.id} onClick={() => setSelectedUser(user)} className="w-full bg-emerald-900/40 border border-emerald-800/50 p-6 rounded-[32px] flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-400">{user.role === 'Admin' ? <ShieldCheck size={24} /> : <UserCircle size={24} />}</div>
                  <div className="text-left">
                    <p className="font-black text-lg leading-none">{user.name}</p>
                    <p className="text-[8px] font-bold text-emerald-500 uppercase mt-1 tracking-widest">{user.role}</p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-emerald-700" />
              </button>
            ))}
            <button onClick={() => setShowImport(true)} className="w-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-black py-5 rounded-[28px] text-[10px] uppercase tracking-[0.2em] mt-8 flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Import Code / Sync
            </button>
          </div>
        ) : (
          <div className="w-full space-y-8 animate-in zoom-in duration-300 flex flex-col items-center">
            <button onClick={() => setSelectedUser(null)} className="self-start text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2 mb-4"><X size={14} /> Back</button>
            <div className="text-center">
               <div className="w-20 h-20 bg-emerald-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-2xl">
                 {selectedUser.role === 'Admin' ? <ShieldCheck size={40} className="text-emerald-400" /> : <UserCircle size={40} className="text-emerald-400" />}
               </div>
               <h2 className="text-2xl font-black">{selectedUser.name}</h2>
               <p className="text-emerald-500/50 text-[10px] font-black uppercase mt-3 tracking-widest">Enter {selectedUser.role} PIN</p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-2 justify-center">
                {pinArr.map((digit, idx) => (
                  <input key={idx} ref={el => { pinRefs.current[idx] = el; }} type="password" inputMode="numeric" maxLength={1} className="w-12 h-14 bg-emerald-900/30 border border-emerald-800/60 rounded-xl text-center text-xl font-black" value={digit} onChange={e => handleInputChange(e.target.value, idx)} onKeyDown={e => handleKeyDown(e, idx)} autoFocus={idx === 0} />
                ))}
              </div>

              <button onClick={handleLogin} className="w-full bg-white text-emerald-950 font-black py-6 px-12 rounded-[32px] shadow-2xl uppercase tracking-widest text-sm">Unlock Terminal</button>
              
              {selectedUser.role === 'Admin' && (
                <button 
                  onClick={() => setShowForgotPin(true)}
                  className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                >
                  Forgot Admin PIN?
                </button>
              )}
            </div>

            {error && <p className="text-red-400 text-xs font-black uppercase mt-4 animate-bounce">{error}</p>}
          </div>
        )}
      </div>

      {/* Forgot PIN Recovery Modal */}
      {showForgotPin && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-emerald-900 w-full max-sm rounded-[48px] p-10 text-emerald-950 dark:text-white shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-600 dark:text-emerald-400 pointer-events-none">
              <Lock size={120} />
            </div>

            <button 
              onClick={() => { setShowForgotPin(false); setResetKeyInput(''); setRecoveryError(''); }} 
              className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-emerald-800 rounded-full text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-[32px] flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 shadow-inner">
                <HelpCircle size={40} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight italic">PIN Recovery</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-emerald-500/60 uppercase tracking-widest">Master Identity Check</p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-800 space-y-3">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Your Request Code</p>
                <div className="flex items-center justify-center gap-3">
                   <span className="text-3xl font-mono font-black tracking-[0.1em] text-emerald-900 dark:text-emerald-300">{requestCode}</span>
                   <button onClick={copyRequestCode} className="p-2.5 bg-white dark:bg-emerald-800 rounded-xl shadow-sm text-emerald-600">
                     {isCopied ? <Check size={16} /> : <Copy size={16} />}
                   </button>
                </div>
              </div>

              <p className="text-[10px] font-bold text-slate-500 dark:text-emerald-100/60 leading-relaxed px-2">
                To reset your PIN, send this Request Code to support on WhatsApp. A technical reset fee may apply.
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 block text-left">8-Character Reset Key</label>
                  <input 
                    type="text" 
                    placeholder="Enter Key" 
                    className="w-full bg-slate-50 dark:bg-emerald-950 border border-slate-100 dark:border-emerald-800 rounded-2xl py-4 px-6 font-mono text-center font-black uppercase tracking-[0.3em] outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    value={resetKeyInput}
                    onChange={(e) => setResetKeyInput(e.target.value.substring(0, 8))}
                  />
                </div>

                <button 
                  onClick={handleResetVerification}
                  disabled={resetKeyInput.length !== 8 || isVerifyingReset}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {isVerifyingReset ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />} Verify & Reset
                </button>

                <a 
                  href={`https://wa.me/2347062228026?text=Hello,%20I%20forgot%20my%20NaijaShop%20Admin%20PIN.%20Request%20Code:%20${requestCode}`}
                  target="_blank"
                  className="w-full py-4 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all"
                >
                  <MessageCircle size={14} /> Contact Support
                </a>
              </div>

              {recoveryError && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/40 flex items-center gap-2 justify-center">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">{recoveryError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
