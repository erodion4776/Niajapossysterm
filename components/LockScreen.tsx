
import React, { useState, useEffect } from 'react';
import { MessageCircle, Lock, ShieldCheck, Key, Copy, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { getRequestCode, verifyActivationKey } from '../utils/security.ts';
import { db } from '../db.ts';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [requestCode, setRequestCode] = useState<string>('LOADING...');
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // OTP Flow States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [tempOtp, setTempOtp] = useState('');

  useEffect(() => {
    getRequestCode().then(setRequestCode);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(requestCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    setIsVerifying(true);
    const isValid = await verifyActivationKey(requestCode, activationKey);
    
    if (isValid) {
      // 1. Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setTempOtp(otp);

      // 2. Persistent storage for next phase
      localStorage.setItem('temp_otp', otp);
      localStorage.setItem('is_activated', 'true');
      localStorage.setItem('is_setup_pending', 'true');
      
      await db.settings.put({ key: 'is_activated', value: true });
      
      setShowOtpScreen(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
    setIsVerifying(false);
  };

  if (showOtpScreen) {
    return (
      <div className="fixed inset-0 z-[600] bg-emerald-950 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-[32px] flex items-center justify-center mb-8 border border-emerald-500/30 shadow-2xl relative">
          <ShieldCheck size={48} className="text-emerald-400 z-10" />
          <div className="absolute inset-0 bg-emerald-400/10 animate-ping rounded-[32px]"></div>
        </div>
        
        <h1 className="text-3xl font-black mb-2 tracking-tight uppercase leading-tight">License<br/>Unlocked!</h1>
        <p className="text-emerald-100/60 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
          Your Temporary Admin PIN is shown below. You must use it once to set your permanent secret PIN.
        </p>

        <div className="w-full max-w-sm bg-white/5 border border-white/10 p-10 rounded-[48px] mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Security OTP</p>
          <div className="text-6xl font-mono font-black tracking-[0.2em] text-white py-2">
            {tempOtp}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-amber-400 bg-amber-400/10 py-3 px-6 rounded-2xl border border-amber-400/20">
            <AlertCircle size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Write this down now!</span>
          </div>
        </div>

        <button 
          onClick={() => {
            // Force reload to trigger App.tsx switchboard evaluation
            window.location.reload();
          }}
          className="w-full max-w-sm bg-white text-emerald-950 font-black py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl uppercase tracking-widest text-xs"
        >
          Go to PIN Setup <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-[24px] flex items-center justify-center mb-6 animate-pulse border border-emerald-500/30 shadow-2xl">
        <Lock size={40} className="text-emerald-400" />
      </div>
      
      <h1 className="text-3xl font-black mb-2 tracking-tight uppercase">App Locked</h1>
      <p className="text-emerald-100/60 mb-8 max-w-xs mx-auto text-sm font-medium">
        License verification required. Send your Request Code to get an activation key.
      </p>

      <div className="w-full max-w-sm space-y-6">
        <div className="bg-emerald-900/40 border border-emerald-800/60 p-6 rounded-[32px] space-y-3 shadow-inner">
          <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.2em]">Your Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-mono font-black tracking-widest text-white">{requestCode}</span>
            <button onClick={handleCopy} className="p-2 bg-emerald-800/50 hover:bg-emerald-700/50 rounded-lg">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-emerald-500" />}
            </button>
          </div>
        </div>

        <a 
          href={`https://api.whatsapp.com/send?phone=2347062228026&text=Hello,%20activate%20POS:%20${requestCode}`} 
          target="_blank"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl uppercase tracking-widest text-xs"
        >
          <MessageCircle size={24} /> Get Key on WhatsApp
        </a>

        <div className="relative pt-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-emerald-800"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest bg-emerald-950 px-3 text-emerald-700">Enter Key Below</div>
        </div>

        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="PASTE ACTIVATION KEY"
            className={`w-full bg-emerald-900/50 border ${error ? 'border-red-500' : 'border-emerald-700'} rounded-[24px] py-5 text-center font-mono tracking-widest focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all text-sm uppercase`}
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
          />
          <button onClick={handleActivate} disabled={isVerifying || !activationKey} className="w-full bg-white text-emerald-900 font-black py-5 rounded-[24px] hover:bg-emerald-50 active:scale-95 transition-all shadow-lg text-xs uppercase tracking-widest">
            {isVerifying ? 'Checking...' : 'Activate Now'}
          </button>
          {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce mt-2">Invalid Activation Key</p>}
        </div>
      </div>
    </div>
  );
};
