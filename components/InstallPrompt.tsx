
import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Share, PlusSquare, ArrowRight, Zap } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Standalone check
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      console.log('PWA: Already running in standalone mode');
      return;
    }

    // 2. Identify platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphone);

    // 3. Early Event Listener
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('PWA: Install event captured');
      e.preventDefault();
      setDeferredPrompt(e);
      // Store globally so Admin > Settings can access it
      (window as any).deferredPWAPrompt = e;
      
      // Only show banner if on the app route and not dismissed
      const isAppRoute = window.location.pathname.includes('/app');
      if (isAppRoute && !sessionStorage.getItem('install_dismissed')) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Specific Delay Show
    if (isIphone && window.location.pathname.includes('/app') && !sessionStorage.getItem('install_dismissed')) {
      const timer = setTimeout(() => setIsVisible(true), 8000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (window as any).deferredPWAPrompt;
    if (!prompt) return;
    
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log(`PWA: User choice: ${outcome}`);
    if (outcome === 'accepted') {
      setIsVisible(false);
      (window as any).deferredPWAPrompt = null;
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('install_dismissed', 'true');
  };

  // Do not show if not in /app route
  if (!window.location.pathname.includes('/app')) return null;
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[2000] animate-in slide-in-from-bottom duration-500">
      <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-[32px] animate-pulse"></div>
      
      <div className="relative bg-emerald-950 border-2 border-emerald-500/40 p-5 rounded-[32px] shadow-2xl flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
          {isIOS ? <Share size={24} /> : <Download size={24} />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            💼 Open Shop Faster!
          </h3>
          <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-wider mt-0.5 leading-tight">
            {isIOS 
              ? "Tap 'Share' then 'Add to Home Screen' to install." 
              : "Install NaijaShop for the best offline experience."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isIOS ? (
            <button 
              onClick={handleInstallClick}
              className="bg-emerald-500 text-emerald-950 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              Install <Zap size={12} className="fill-emerald-950" />
            </button>
          ) : (
             <div className="bg-white/10 p-2.5 rounded-xl">
                <PlusSquare size={20} className="text-emerald-400" />
             </div>
          )}
          
          <button 
            onClick={dismiss}
            className="p-2 text-emerald-500/50 hover:text-emerald-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
