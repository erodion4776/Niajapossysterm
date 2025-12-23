
import React, { useState } from 'react';
import { db } from '../db.ts';
import { Key, ShieldCheck, CheckCircle2, AlertCircle, Smartphone, Lock } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'OTP' | 'PIN'>('OTP');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleVerifyOtp = () => {
    const savedOtp = localStorage.getItem('temp_otp');
    if (enteredOtp === savedOtp) {
      setStep('PIN');
      setError('');
    } else {
      setError('Invalid OTP. Please check your notes.');
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // PIN Validation
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
      // 4. Update the Admin User PIN in DB
      const admin = await db.users.where('role').equals('Admin').first();
      if (admin && admin.id) {
        await db.users.update(admin.id, { pin: newPin });
        
        // Finalize setup state
        localStorage.removeItem('is_setup_pending');
        localStorage.removeItem('temp_otp');
        localStorage.setItem('is_first_launch', 'false');
        
        onComplete();
      }
    } catch (err) {
      setError('System Error: Could not save PIN');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-emerald-950 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-500">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-2xl">
            {step === 'OTP' ? <Key size={40} /> : <Lock size={40} />}
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
            {step === 'OTP' ? 'Identity Check' : 'Create PIN'}
          </h2>
          <p className="text-emerald-500/60 text-[11px] font-medium leading-relaxed px-4">
            {step === 'OTP' 
              ? 'Enter the 6-digit Temporary PIN (OTP) from the previous screen.' 
              : 'Secure your shop. Set a 4-digit PIN you will use for daily login.'}
          </p>
        </div>

        {step === 'OTP' ? (
          <div className="space-y-6">
            <input 
              type="text" inputMode="numeric" maxLength={6} placeholder="6-DIGIT OTP"
              className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[28px] py-6 text-center text-3xl tracking-[0.4em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner uppercase"
              value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)}
            />
            {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] animate-bounce">{error}</p>}
            <button 
              onClick={handleVerifyOtp}
              className="w-full bg-white text-emerald-950 font-black py-6 rounded-[28px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Verify Identity
            </button>
          </div>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-4">
            <div className="space-y-4">
              <input 
                type="password" inputMode="numeric" maxLength={4} placeholder="NEW 4-DIGIT PIN"
                className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[28px] py-6 text-center text-3xl tracking-[0.6em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                value={newPin} onChange={(e) => setNewPin(e.target.value)}
              />
              <input 
                type="password" inputMode="numeric" maxLength={4} placeholder="CONFIRM PIN"
                className="w-full bg-emerald-900/30 border border-emerald-800/60 rounded-[28px] py-6 text-center text-3xl tracking-[0.6em] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="text-red-400" size={18} />
                <p className="text-red-300 text-[10px] font-black uppercase tracking-widest">{error}</p>
              </div>
            )}
            <button type="submit" className="w-full bg-emerald-500 text-emerald-950 font-black py-6 rounded-[28px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              Save & Start Selling <CheckCircle2 size={18} />
            </button>
          </form>
        )}

        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-start gap-3 text-left">
          <Smartphone className="text-emerald-500 shrink-0" size={16} />
          <p className="text-[9px] text-emerald-100/40 font-bold leading-relaxed">
            <span className="text-emerald-400 block mb-0.5 uppercase tracking-wider">Note:</span>
            If you forget your secret PIN, there is no "Recovery" for offline data. Write it down.
          </p>
        </div>
      </div>
    </div>
  );
};
