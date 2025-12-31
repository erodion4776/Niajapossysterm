import React, { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Capture the Install Event
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Smart Hiding Logic
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      
      if (!isStandalone && !isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      console.log('PWA: App successfully installed');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Trigger Installation
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsVisible(false);
    // Smart Hiding: Save flag in sessionStorage so it doesn't show again during this visit
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[3000] animate-in slide-in-from-bottom duration-500 max-w-lg mx-auto">
      {/* 2. Visual Design: Deep Emerald Green with subtle top border */}
      <div className="bg-[#022c22] border-t border-white/10 p-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.5)] safe-bottom">
        <div className="flex items-center gap-3">
          {/* Left: icon-192.png and text */}
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-500/30 flex-shrink-0">
            <img src="/icon-192.png" alt="App Icon" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h4 className="text-white font-black text-sm leading-none uppercase italic tracking-tight">NaijaShop App</h4>
            <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mt-1">Faster & Works Offline</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Right: INSTALL button with periodic bounce */}
          <button 
            onClick={handleInstall}
            className="bg-emerald-500 text-[#022c22] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
            style={{ animation: 'bouncePeriodic 5s infinite' }}
          >
            INSTALL <Zap size={14} className="fill-[#022c22]" />
          </button>
          
          <button 
            onClick={dismiss}
            className="p-2 text-white/30 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bouncePeriodic {
          0%, 10%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-8px);}
          60% {transform: translateY(-4px);}
        }
      `}</style>
    </div>
  );
};
