
import React, { useState, useEffect } from 'react';
import { MessageCircle, Lock, ShieldCheck, Key, Copy, Check, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';
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
  const [saltMissing, setSaltMissing] = useState(false);
  
  // OTP States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [tempOtp, setTempOtp] = useState('');

  useEffect(() => {
    getRequestCode().then(setRequestCode);
    
    // Check if salt is configured (for developer debugging)
    const env = (import.meta as any).env;
    if (!env?.VITE_APP_SALT) {
      console.error("VITE_APP_SALT is missing in environment variables!");
      setSaltMissing(true);
    }
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

      // 2. Update Admin in DB with this OTP
      const admin = await db.users.where('role').equals('Admin').first();
      if (admin && admin.id) {
        await db.users.update(admin.id, { pin: otp });
      }

      // 3. Mark activation and setup pending
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
      <div className="fixed inset-0 z-[200] bg-emerald-950 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-[32px] flex items-center justify-center mb-8 border border-emerald-500/30 shadow-2xl relative">
          <ShieldCheck size={48} className="text-emerald-400 z-10" />
          <div className="absolute inset-0 bg-emerald-400/10 animate-ping rounded-[32px]"></div>
        </div>
        
        <h1 className="text-3xl font-black mb-2 tracking-tight uppercase">App Activated!</h1>
        <p className="text-emerald-100/60 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
          Security protocol initiated. Use this temporary code to set your permanent Admin PIN.
        </p>

        <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8 rounded-[40px] mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
          <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Temporary Admin PIN</p>
          <div className="text-6xl font-mono font-black tracking-[0.2em] text-white">
            {tempOtp}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-amber-400 bg-amber-400/10 py-2 px-4 rounded-full border border-amber-400/20">
            <AlertCircle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Write this down now</span>
          </div>
        </div>

        <button 
          onClick={onUnlock}
          className="w-full max-w-sm bg-white text-emerald-950 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl uppercase tracking-widest text-xs"
        >
          Continue to Login <ArrowRight size={18} />
        </button>

        <p className="mt-8 text-[9px] text-emerald-500/30 font-black uppercase tracking-[0.2em]">
          Secured by NaijaShop Multi-Layer Shield
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center overflow-y-auto">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-[24px] flex items-center justify-center mb-6 animate-pulse border border-emerald-500/30 shadow-2xl">
        <Lock size={40} className="text-emerald-400" />
      </div>
      
      <h1 className="text-3xl font-black mb-2 tracking-tight">App Locked</h1>
      <p className="text-emerald-100/60 mb-8 max-w-xs mx-auto text-sm">
        Activation required. Please send your Request Code to the developer.
      </p>

      {saltMissing && window.location.hostname === 'localhost' && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-[10px] font-bold text-red-200 uppercase flex items-center gap-2">
          <AlertCircle size={14} />
          Developer: VITE_APP_SALT is not set!
        </div>
      )}

      <div className="w-full max-w-sm space-y-6">
        <div className="bg-emerald-900/40 border border-emerald-800/60 p-6 rounded-[32px] space-y-3 shadow-inner">
          <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.2em]">Your Request Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-mono font-black tracking-widest text-white">{requestCode}</span>
            <button 
              onClick={handleCopy}
              className="p-2 bg-emerald-800/50 hover:bg-emerald-700/50 rounded-lg transition-all"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-emerald-500" />}
            </button>
          </div>
        </div>

        <a 
          href={`https://api.whatsapp.com/send?phone=2347062228026&text=Hello,%20I%20want%20to%20activate%20my%20NaijaShop%20POS.%0A%0ARequest%20Code:%20${requestCode}`} 
          target="_blank"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-900/40 uppercase tracking-widest text-xs"
        >
          <MessageCircle size={24} />
          Send via WhatsApp
        </a>

        <div className="relative pt-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-emerald-800"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-emerald-950 px-3 text-emerald-700">Enter Activation Key</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
            <input 
              type="text" 
              placeholder="PASTE KEY HERE"
              className={`w-full bg-emerald-900/50 border ${error ? 'border-red-500' : 'border-emerald-700'} rounded-[24px] py-5 pl-12 pr-4 text-center font-mono tracking-widest focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all text-sm uppercase`}
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
            />
          </div>
          <button 
            onClick={handleActivate}
            disabled={isVerifying || !activationKey}
            className="w-full bg-white text-emerald-900 font-black py-4 rounded-[24px] hover:bg-emerald-50 active:scale-95 transition-all shadow-lg disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {isVerifying ? 'Verifying...' : 'Verify & Unlock'}
          </button>
          {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce mt-2">Invalid Key Provided</p>}
        </div>
      </div>

      <div className="mt-12 flex items-center gap-2 text-emerald-500/30 text-[9px] font-black uppercase tracking-widest">
        <ShieldCheck size={14} />
        <span>Secured Offline Activation</span>
      </div>
    </div>
  );
};
