
import React, { useState } from 'react';
import { MessageCircle, Lock, ShieldCheck, Key } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

const SECRET_CODE = "NaijaOwner2025";

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState(false);

  const handleActivate = () => {
    if (inputCode === SECRET_CODE) {
      localStorage.setItem('is_paid', 'true');
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Lock size={48} className="text-emerald-400" />
      </div>
      
      <h1 className="text-3xl font-black mb-2">Shop Manager Locked</h1>
      <p className="text-emerald-100/70 mb-8 max-w-xs mx-auto">
        Your trial has expired. Your business data is safe, but you must activate the full version to continue recording sales.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <a 
          href="https://wa.me/2348000000000?text=I_want_to_unlock_my_POS_app" 
          target="_blank"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-900/40"
        >
          <MessageCircle size={24} />
          Chat with Developer
        </a>

        <div className="relative pt-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-emerald-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-emerald-950 px-2 text-emerald-500 font-bold">OR ACTIVATE</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
            <input 
              type="text" 
              placeholder="Enter Activation Key"
              className={`w-full bg-emerald-900/50 border ${error ? 'border-red-500' : 'border-emerald-700'} rounded-xl py-4 pl-12 pr-4 text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all`}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
            />
          </div>
          <button 
            onClick={handleActivate}
            className="w-full bg-white text-emerald-900 font-black py-3 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all"
          >
            Submit Key
          </button>
          {error && <p className="text-red-400 text-sm font-bold animate-bounce mt-2">Invalid Activation Key</p>}
        </div>
      </div>

      <div className="mt-12 flex items-center gap-2 text-emerald-500/50 text-xs font-medium">
        <ShieldCheck size={14} />
        <span>Military-grade local data encryption</span>
      </div>
    </div>
  );
};
