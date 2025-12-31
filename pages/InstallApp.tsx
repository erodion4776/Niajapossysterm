
import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Download, Share, PlusSquare, 
  ShieldCheck, Zap, ArrowRight, X, Info, 
  CloudOff, Plane, Compass
} from 'lucide-react';

interface InstallAppProps {
  onNext: () => void;
  deferredPrompt: any;
}

export const InstallApp: React.FC<InstallAppProps> = ({ onNext, deferredPrompt }) => {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect if user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isApple);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("Installation ready! If the popup didn't appear, look for 'Install App' in your browser menu.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User response to install: ${outcome}`);
    
    // Proceed regardless of outcome (if they cancel, they can still skip)
    if (outcome === 'accepted') {
      onNext();
    }
  };

  return (
    <div className="fixed inset-0 z-[800] bg-emerald-950 flex flex-col text-white animate-in fade-in duration-500 overflow-y-auto">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-700 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-8 max-w-md mx-auto w-full">
        {/* Header Section */}
        <div className="text-center pt-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Step 1: Secure Setup
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Download Your <br/>
            <span className="text-emerald-500">Digital Shop</span>
          </h1>
        </div>

        {/* Visual Hero */}
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <div className="relative group">
            <div className="w-40 h-40 bg-emerald-500/10 rounded-[48px] flex items-center justify-center border border-emerald-500/20 shadow-2xl relative overflow-hidden">
               <Smartphone size={80} className="text-emerald-400 group-hover:scale-110 transition-transform duration-500" />
               <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            {/* Pulsing rings */}
            <div className="absolute -inset-4 border border-emerald-500/20 rounded-[56px] animate-pulse"></div>
            <div className="absolute -inset-8 border border-emerald-500/10 rounded-[64px] animate-pulse [animation-delay:0.5s]"></div>
          </div>

          <div className="mt-12 text-center space-y-4">
            <p className="text-lg font-bold text-emerald-100/90 leading-relaxed">
              Install NaijaShop on your home screen to work <span className="text-white font-black underline decoration-emerald-500">100% Offline</span> and stop the "Data Tax."
            </p>
            <div className="flex justify-center gap-6 pt-4">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/5 rounded-xl"><Plane size={20} className="text-emerald-500" /></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-100/40">Airplane Mode</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/5 rounded-xl"><CloudOff size={20} className="text-emerald-500" /></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-100/40">Zero Data Cost</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/5 rounded-xl"><Zap size={20} className="text-emerald-500" /></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-100/40">Instant Load</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="space-y-6 pb-8">
          {!isIOS ? (
            /* Android / Chrome Logic */
            <button 
              onClick={handleInstall}
              className="w-full bg-emerald-500 text-[#022c22] font-black py-6 rounded-[32px] text-lg shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
            >
              <Download size={24} strokeWidth={3} />
              Install NaijaShop Now
            </button>
          ) : (
            /* iOS Specific UI */
            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-700">
               <div className="flex items-center gap-3 mb-2">
                 <Compass className="text-emerald-500" size={24} />
                 <h3 className="font-black text-sm uppercase tracking-widest">Safari Instructions</h3>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center font-black text-xs shrink-0">1</div>
                    <p className="text-xs font-bold text-emerald-100/80">Tap the <span className="bg-white/10 px-2 py-1 rounded inline-flex items-center gap-1"><Share size={12}/> Share</span> button below.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center font-black text-xs shrink-0">2</div>
                    <p className="text-xs font-bold text-emerald-100/80">Scroll down and tap <span className="bg-white/10 px-2 py-1 rounded inline-flex items-center gap-1"><PlusSquare size={12}/> Add to Home Screen</span>.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center font-black text-xs shrink-0">3</div>
                    <p className="text-xs font-bold text-emerald-100/80">Tap <span className="text-emerald-400 font-black uppercase">Add</span> in the top corner.</p>
                  </div>
               </div>
            </div>
          )}

          <button 
            onClick={onNext}
            className="w-full py-4 text-emerald-100/40 font-black uppercase text-[10px] tracking-[0.3em] active:text-emerald-400 transition-colors"
          >
            I already installed / Skip for now
          </button>

          <div className="flex items-center justify-center gap-3 opacity-30">
            <ShieldCheck size={16} />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Google Verified PWA Technology</p>
          </div>
        </div>
      </div>
    </div>
  );
};
