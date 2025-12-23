
import React, { useState, useEffect } from 'react';
import { MessageCircle, Lock, ShieldCheck, Key, Copy, Check, AlertCircle } from 'lucide-react';
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
      localStorage.setItem('is_activated', 'true');
      await db.settings.put({ key: 'is_activated', value: true });
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
    setIsVerifying(false);
  };

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
