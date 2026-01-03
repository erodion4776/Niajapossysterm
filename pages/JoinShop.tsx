
import React, { useEffect, useState } from 'react';
import { processStaffInvite } from '../utils/whatsapp.ts';
import { Store, Loader2, CheckCircle2, ShieldAlert, Smartphone } from 'lucide-react';

export const JoinShop: React.FC = () => {
  const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [shopName, setShopName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const onboard = async () => {
      const params = new URLSearchParams(window.location.search);
      const key = params.get('key');

      if (!key) {
        setStatus('ERROR');
        setErrorMsg("Missing invitation key. Please ask Boss for a new link.");
        return;
      }

      const result = await processStaffInvite(key);
      if (result.success) {
        setShopName(result.shopName || 'the Shop');
        setStatus('SUCCESS');
        // Auto redirect to app after animation
        setTimeout(() => {
          window.location.href = '/app';
        }, 2500);
      } else {
        setStatus('ERROR');
        setErrorMsg(result.error || "Could not process invite.");
      }
    };

    onboard();
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-emerald-950 flex flex-col items-center justify-center p-8 text-white text-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-700 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-700">
        {status === 'LOADING' && (
          <div className="space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-[40px] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-2xl relative overflow-hidden">
               <Smartphone size={48} className="text-emerald-400" />
               <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent"></div>
            </div>
            <div className="space-y-2">
              <Loader2 className="mx-auto text-emerald-500 animate-spin" size={32} />
              <h1 className="text-2xl font-black uppercase italic tracking-tighter">Setting up Terminal...</h1>
              <p className="text-emerald-100/40 text-[10px] font-bold uppercase tracking-[0.2em]">Configuring Secure Staff Access</p>
            </div>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
               <CheckCircle2 size={48} className="text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">Welcome Boss!</h1>
              <p className="text-emerald-400 text-lg font-black uppercase tracking-tight">You've joined {shopName}</p>
              <p className="text-emerald-100/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-4">Redirecting to Login...</p>
            </div>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="space-y-6 animate-in shake duration-500">
            <div className="w-24 h-24 bg-red-500/20 rounded-[40px] flex items-center justify-center mx-auto border border-red-500/40">
               <ShieldAlert size={48} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase italic tracking-tighter text-red-400">Invite Failed</h1>
              <p className="text-slate-400 text-sm font-bold px-6">{errorMsg}</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="mt-8 bg-white text-emerald-950 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95"
              >
                Go to Home Page
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-2 opacity-20">
        <Store size={16} className="text-emerald-500" />
        <span className="text-[8px] font-black text-emerald-100 uppercase tracking-[0.4em]">NaijaShop Secure Onboarding</span>
      </div>
    </div>
  );
};
