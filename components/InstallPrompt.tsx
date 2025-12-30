
import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Share, PlusSquare, ArrowRight, Zap } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 2. Identify iOS users
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphone);

    // 3. Listen for Android/Chrome prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt if not previously dismissed this session
      if (!sessionStorage.getItem('install_dismissed')) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. For iOS, show after a 5 second delay to let the user see the app first
    if (isIphone && !sessionStorage.getItem('install_dismissed')) {
      const timer = setTimeout(() => setIsVisible(true), 5000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[2000] animate-in slide-in-from-bottom duration-500">
      {/* Banner Glow Effect */}
      <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-[32px] animate-pulse"></div>
      
      <div className="relative bg-emerald-950 border-2 border-emerald-500/40 p-5 rounded-[32px] shadow-2xl flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
          {isIOS ? <Share size={24} /> : <Download size={24} />}
        </div>

        {/* Content */}
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

        {/* Actions */}
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
