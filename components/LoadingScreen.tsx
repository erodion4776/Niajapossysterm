
import React from 'react';
import { Store, Loader2, ShieldCheck } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[10000] bg-emerald-950 flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-700 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
        {/* Pulsing Branded Logo */}
        <div className="relative group mb-12">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center border border-emerald-500/20 shadow-2xl relative overflow-hidden animate-pulse">
             <Store size={48} className="text-emerald-500" />
          </div>
          {/* Animated rings */}
          <div className="absolute -inset-4 border border-emerald-500/20 rounded-[40px] animate-ping opacity-20"></div>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="text-emerald-500 animate-spin" size={32} />
          
          <div className="text-center space-y-1">
            <h2 className="text-white font-black text-xs uppercase tracking-[0.3em] italic">NaijaShop POS</h2>
            <p className="text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              Securing your shop...
            </p>
          </div>
        </div>
      </div>

      {/* Safety Badge at Bottom */}
      <div className="absolute bottom-12 flex items-center gap-2 opacity-30">
        <ShieldCheck size={16} className="text-emerald-500" />
        <span className="text-[8px] font-black text-emerald-100 uppercase tracking-[0.4em]">100% Offline Database Ready</span>
      </div>
    </div>
  );
};
