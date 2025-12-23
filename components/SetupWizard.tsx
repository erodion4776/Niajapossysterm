
import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { Key, ShieldCheck, CheckCircle2, AlertCircle, Smartphone, Lock, Eye, ArrowRight, ChevronLeft } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

type SetupStep = 'REVEAL' | 'VERIFY' | 'PIN';

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<SetupStep>('REVEAL');
  const [tempOtp, setTempOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shopName, setShopName] = useState<string>('Your Shop');

  useEffect(() => {
    const otp = localStorage.getItem('temp_otp') || '';
    const name = localStorage.getItem('shop_name') || 'Your Shop';
    setTempOtp(otp);
    setShopName(name);
  }, []);

  const handleVerifyOtp = () => {
    if (enteredOtp === tempOtp) {
      setStep('PIN');
      setError('');
    } else {
      setError('Invalid code. Please check your notes.');
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    if (newPin === '0000') {
      setError('PIN "0000" is blocked for security');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      const admin = await db.users.where('role').equals('Admin').first();
      if (admin && admin.id) {
        await db.users.update(admin.id, { pin: newPin });
        localStorage.removeItem('is_setup_pending');
        localStorage.removeItem('temp_otp');
        onComplete();
      }
    } catch (err) {
      setError('System Error: Could not save PIN');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-emerald-950 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-500">
      <div className="w-full max-w-sm space-y-8">
        
        {step === 'REVEAL' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-2xl">
                <Eye size={40} />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2 uppercase leading-none">
                Welcome to <br/> <span className="text-emerald-400">{shopName}</span>
              </h2>
              <p className="text-emerald-500/60 text-[11px] font-medium leading-relaxed px-4">
                This is your One-Time Setup Code. You will need it to verify your identity on the next screen.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-10 rounded-[48px] relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Verification Code</p>
              <div className="text-6xl font-mono font-black tracking-[0.2em] text-white py-2">{tempOtp}</div>
            </div>

            <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle className="text-amber-400 shrink-0" size={16} />
              <p className="text-[10px] text-amber-200/60 font-bold leading-relaxed">Please write this code down or copy it now. You cannot proceed without it.</p>
            </div>

            <button onClick={() => setStep('VERIFY')} className="w-full bg-white text-emerald-950 font-black py-6 rounded-[28px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3">
              Continue to Verify <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 'VERIFY' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
             <button onClick={() => setStep('REVEAL')} className="flex items-center gap-2 text-emerald-500/60 text-[10px] font-black uppercase tracking-widest bg-emerald-900/40 px-4 py-2 rounded-full mx-auto">
              <ChevronLeft size={14} /> Back to Code
            </button>

            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-2xl">
                <Key size={40} />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Verify Identity</h2>
              <p className="text-emerald-500/60 text-[11px] font-medium leading-relaxed px-4">Enter the 6-digit code we just showed you.</p>
            </div>

            <div className="space-y-6">
              <input type="text" inputMode="numeric" maxLength={6} placeholder="6-DIGIT OTP" className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[28px] py-6 text-center text-3xl tracking-[0.4em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner uppercase" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} />
              {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] animate-bounce">{error}</p>}
              <button onClick={handleVerifyOtp} className="w-full bg-white text-emerald-950 font-black py-6 rounded-[28px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs">Verify Code</button>
            </div>
          </div>
        )}

        {step === 'PIN' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-2xl">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Secure Your Shop</h2>
              <p className="text-emerald-500/60 text-[11px] font-medium leading-relaxed px-4">Create a 4-digit PIN that only you (the owner) will know.</p>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="space-y-4">
                <input type="password" inputMode="numeric" maxLength={4} placeholder="NEW 4-DIGIT PIN" className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[28px] py-6 text-center text-3xl tracking-[0.6em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
                <input type="password" inputMode="numeric" maxLength={4} placeholder="CONFIRM PIN" className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[28px] py-6 text-center text-3xl tracking-[0.6em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="text-red-400" size={18} />
                  <p className="text-red-300 text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}
              <button type="submit" className="w-full bg-emerald-500 text-emerald-950 font-black py-6 rounded-[28px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                Save & Open Shop <CheckCircle2 size={18} />
              </button>
            </form>
          </div>
        )}

        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-start gap-3 text-left">
          <Smartphone className="text-emerald-500 shrink-0" size={16} />
          <p className="text-[9px] text-emerald-100/40 font-bold leading-relaxed">
            <span className="text-emerald-400 block mb-0.5 uppercase tracking-wider">Note:</span>
            Your shop is fully offline. If you forget your PIN, data cannot be recovered without a previous WhatsApp backup.
          </p>
        </div>
      </div>
    </div>
  );
};
