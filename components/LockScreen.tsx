
import React, { useState, useEffect } from 'react';
import { MessageCircle, Lock, ShieldCheck, Key, Copy, Check, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { getRequestCode, verifyActivationKey } from '../utils/security.ts';
import { db } from '../db.ts';

interface LockScreenProps {
  onUnlock: () => void;
  isExpired?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, isExpired }) => {
  const [requestCode, setRequestCode] = useState<string>('LOADING...');
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const isTrialExpired = localStorage.getItem('is_trialing') === 'true';

  // OTP Reveal State
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
    const result = await verifyActivationKey(requestCode, activationKey);
    
    if (result.isValid && result.expiry) {
      // 1. Wipe Protection Sync (LS + DB Security Table)
      localStorage.setItem('subscription_expiry', result.expiry.toString());
      localStorage.setItem('is_activated', 'true');
      localStorage.removeItem('is_trialing');
      
      await db.security.put({ key: 'subscription_expiry', value: result.expiry });
      await db.security.put({ key: 'is_activated', value: true });

      // If it was just an expiry renewal, we don't need onboarding again
      const isFirstTime = localStorage.getItem('is_setup_pending') !== 'false';
      
      if (isFirstTime) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setTempOtp(otp);
        localStorage.setItem('temp_otp', otp);
        localStorage.setItem('is_setup_pending', 'true');
        setShowOtpScreen(true);
      } else {
        onUnlock();
      }
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
        <h1 className="text-3xl font-black mb-2 tracking-tight uppercase leading-tight">App Activated!</h1>
        <p className="text-emerald-100/60 mb-8 max-w-xs mx-auto text-sm leading-relaxed">Your Temporary Admin PIN is shown below. Store it safely.</p>

        <div className="w-full max-w-sm bg-white/5 border border-white/10 p-10 rounded-[48px] mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Admin Setup OTP</p>
          <div className="text-6xl font-mono font-black tracking-[0.2em] text-white py-2">{tempOtp}</div>
        </div>

        <button onClick={() => window.location.reload()} className="w-full max-w-sm bg-white text-emerald-950 font-black py-6 rounded-[28px] flex items-center justify-center gap-3 active:scale-95 shadow-xl uppercase tracking-widest text-xs">
          Create Secret PIN <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center overflow-y-auto">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-[24px] flex items-center justify-center mb-6 border border-emerald-500/30 shadow-2xl">
        {isExpired ? <ShieldAlert size={40} className="text-amber-400" /> : <Lock size={40} className="text-emerald-400" />}
      </div>
      
      <h1 className="text-3xl font-black mb-2 tracking-tighter uppercase">
        {isExpired ? 'Subscription Expired' : (isTrialExpired ? 'Trial Expired' : 'Enter License')}
      </h1>
      <p className="text-emerald-100/60 mb-8 max-w-xs mx-auto text-sm font-medium">
        {isExpired 
          ? 'Your annual subscription has ended. Pay ₦10,000 for another year of offline access.' 
          : 'License required for activation. Send your Request Code to get an activation key.'}
      </p>

      <div className="w-full max-w-sm space-y-6">
        <div className="bg-emerald-900/40 border border-emerald-800/60 p-6 rounded-[32px] space-y-3 shadow-inner">
          <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.2em]">Request Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-mono font-black tracking-widest text-white">{requestCode}</span>
            <button onClick={handleCopy} className="p-2 bg-emerald-800/50 hover:bg-emerald-700/50 rounded-lg active:scale-90 transition-all">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-emerald-500" />}
            </button>
          </div>
        </div>

        <a 
          href={`https://api.whatsapp.com/send?phone=2347062228026&text=Hello,%20I%20want%20to%20activate/renew%20NaijaShop%20POS.%20Request%20Code:%20${requestCode}`} 
          target="_blank"
          className="w-full bg-emerald-500 text-emerald-950 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 active:scale-95 shadow-xl uppercase tracking-widest text-xs"
        >
          <MessageCircle size={24} /> Get Activation Key
        </a>

        <div className="relative pt-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-emerald-800"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest bg-emerald-950 px-3 text-emerald-700">Enter Key Below</div>
        </div>

        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="XXXXX-XXXXXXXX"
            className={`w-full bg-emerald-900/50 border ${error ? 'border-red-500' : 'border-emerald-700'} rounded-[24px] py-5 text-center font-mono tracking-widest focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all text-sm uppercase shadow-inner`}
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
          />
          <button onClick={handleActivate} disabled={isVerifying || !activationKey} className="w-full bg-white text-emerald-900 font-black py-5 rounded-[24px] hover:bg-emerald-50 active:scale-95 transition-all shadow-lg text-xs uppercase tracking-widest">
            {isVerifying ? 'Verifying...' : 'Verify & Unlock'}
          </button>
          {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce mt-2">Invalid Key Provided</p>}
        </div>
      </div>
    </div>
  );
};
