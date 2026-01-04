
import React, { useState, useRef, useEffect } from 'react';
import { db } from '../db.ts';
import { Lock, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, ChevronLeft, Sparkles } from 'lucide-react';

interface SetupPINProps {
  onComplete: () => void;
  onBack: () => void;
}

export const SetupPIN: React.FC<SetupPINProps> = ({ onComplete, onBack }) => {
  const [pinArr, setPinArr] = useState(new Array(4).fill(''));
  const [confirmArr, setConfirmArr] = useState(new Array(4).fill(''));
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    pinRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (val: string, index: number, isConfirm: boolean) => {
    if (!/^\d*$/.test(val)) return;
    const currentArr = isConfirm ? confirmArr : pinArr;
    const currentSetter = isConfirm ? setConfirmArr : setPinArr;
    const currentRefs = isConfirm ? confirmRefs : pinRefs;

    const newArr = [...currentArr];
    newArr[index] = val.slice(-1);
    currentSetter(newArr);
    setError('');

    if (val && index < 3) {
      currentRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, isConfirm: boolean) => {
    const currentArr = isConfirm ? confirmArr : pinArr;
    const currentSetter = isConfirm ? setConfirmArr : setPinArr;
    const currentRefs = isConfirm ? confirmRefs : pinRefs;

    if (e.key === 'Backspace') {
      if (!currentArr[index] && index > 0) {
        const newArr = [...currentArr];
        newArr[index - 1] = '';
        currentSetter(newArr);
        currentRefs.current[index - 1]?.focus();
      } else {
        const newArr = [...currentArr];
        newArr[index] = '';
        currentSetter(newArr);
      }
    }
  };

  const handleFinalize = async () => {
    const pin = pinArr.join('');
    const confirm = confirmArr.join('');

    if (pin.length < 4) {
      setError("Please enter a 4-digit PIN");
      return;
    }
    if (pin !== confirm) {
      setError("PINs do not match. Try again.");
      setConfirmArr(new Array(4).fill(''));
      confirmRefs.current[0]?.focus();
      return;
    }

    try {
      // 1. Get Owner Name from settings
      const ownerNameSetting = await db.settings.get('owner_name');
      const ownerName = ownerNameSetting?.value || 'Shop Owner';

      // 2. Check if Admin already exists (for reset scenario)
      const existingAdmin = await db.users.where('role').equals('Admin').first();

      if (existingAdmin) {
        // Update existing Admin (preserves staff accounts during PIN recovery)
        await db.users.update(existingAdmin.id!, {
          pin: pin,
          name: ownerName // Ensure name is current
        });
      } else {
        // Fresh setup: Create Admin user
        // Fix: Added required 'uuid', 'last_updated', and 'synced' properties to the initial admin user creation object
        await db.users.add({
          uuid: crypto.randomUUID(),
          name: ownerName,
          pin: pin,
          role: 'Admin',
          last_updated: Date.now(),
          synced: 0
        });
      }

      // 3. Finalize setup state
      localStorage.setItem('is_setup_pending', 'false');
      setIsSuccess(true);
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError("Failed to secure terminal. Please try again.");
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[1000] bg-emerald-600 flex flex-col items-center justify-center p-8 text-white text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-white/30">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter italic">Terminal Secured!</h1>
        <p className="text-xl font-bold opacity-90 max-w-xs">Welcome to the Boss Terminal. Opening your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-emerald-950 flex flex-col text-white overflow-y-auto">
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-700 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-6 max-w-md mx-auto w-full">
        <header className="pt-12 pb-8 text-center space-y-4 animate-in fade-in slide-in-from-top duration-700">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/30 shadow-2xl mb-4">
             <Lock size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Security <br/>
            <span className="text-emerald-500">Protocol</span>
          </h1>
          <p className="text-emerald-100/40 text-[10px] font-bold uppercase tracking-[0.3em]">Step 2 of 2: Protection</p>
        </header>

        <main className="flex-1 space-y-12 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Create 4-Digit Admin PIN</p>
              <div className="flex gap-3 justify-center">
                {pinArr.map((d, i) => (
                  <input
                    key={i} ref={el => { pinRefs.current[i] = el; }}
                    type="password" inputMode="numeric" maxLength={1}
                    className="w-14 h-16 bg-white/5 border border-white/20 rounded-2xl text-center text-3xl font-black text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                    value={d} onChange={e => handleInputChange(e.target.value, i, false)}
                    onKeyDown={e => handleKeyDown(e, i, false)}
                  />
                ))}
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.3em]">Confirm Secret PIN</p>
              <div className="flex gap-3 justify-center">
                {confirmArr.map((d, i) => (
                  <input
                    key={i} ref={el => { confirmRefs.current[i] = el; }}
                    type="password" inputMode="numeric" maxLength={1}
                    className="w-14 h-16 bg-white/5 border border-white/20 rounded-2xl text-center text-3xl font-black text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                    value={d} onChange={e => handleInputChange(e.target.value, i, true)}
                    onKeyDown={e => handleKeyDown(e, i, true)}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3 text-red-400 animate-in shake duration-300">
              <AlertCircle size={20} />
              <p className="text-[10px] font-black uppercase leading-tight tracking-widest">{error}</p>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <button 
              onClick={handleFinalize}
              disabled={pinArr.join('').length < 4 || confirmArr.join('').length < 4}
              className="w-full bg-emerald-500 text-emerald-950 font-black py-6 rounded-[32px] text-lg shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter disabled:opacity-30 disabled:grayscale"
            >
              Secure My Shop <ShieldCheck size={20} />
            </button>
            <button onClick={onBack} className="w-full py-4 text-emerald-100/40 font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-2">
              <ChevronLeft size={14} /> Back to Identity
            </button>
          </div>
        </main>

        <footer className="py-8 flex flex-col items-center gap-4 opacity-30">
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Banking-Grade Security</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
