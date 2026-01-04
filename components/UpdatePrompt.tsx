import React from 'react';
// @ts-ignore - handled by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Zap, X } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA: Service Worker Registered');
      // Background check for updates every 60 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('PWA: Registration failed', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    // Triggers the skipWaiting and reload logic
    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[9999] animate-in slide-in-from-bottom duration-500 max-w-lg mx-auto">
      <div className="bg-[#022c22] border-2 border-emerald-500 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-5 border-emerald-500/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/30">
            <Zap size={28} className="fill-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-black text-sm uppercase tracking-tight italic">🚀 New Update Available!</h4>
            <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mt-1 leading-relaxed">
              We've added new features to NaijaShop. Update now to stay current.
            </p>
          </div>
          <button 
            onClick={close}
            className="p-2 text-white/20 hover:text-white transition-colors self-start"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleUpdate}
            className="flex-1 bg-emerald-500 text-[#022c22] font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className="animate-spin-slow" /> Update Now
          </button>
          <button 
            onClick={close}
            className="px-6 py-4 bg-white/5 text-white/40 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-white/5"
          >
            Later
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};