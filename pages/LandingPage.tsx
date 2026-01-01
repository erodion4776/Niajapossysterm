
import React, { useState } from 'react';
import { 
  ShieldCheck, Plane, MessageCircle, Lock, 
  Smartphone, ArrowRight, CheckCircle2, 
  Store, Zap, TrendingUp, AlertCircle, 
  Barcode, Receipt, Wallet, Printer, 
  Clock, ShieldAlert, Users, Landmark,
  BookOpen, Loader2, Sparkles, HelpCircle, Info, Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Page } from '../types.ts';

interface LandingPageProps {
  onStartTrial: () => void;
  onNavigate: (page: Page) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTrial, onNavigate }) => {
  const [isPreparing, setIsPreparing] = useState(false);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio chime skipped");
    }
  };

  const handleStartTrialClick = () => {
    // 1. Confetti Burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#fbbf24', '#ffffff'],
      ticks: 200,
      gravity: 1.2,
      scalar: 1.2
    });

    // 2. Sound Effect
    playChime();

    // 3. Show Overlay
    setIsPreparing(true);

    // 4. Set Persistence Flags Immediately
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', Date.now().toString());

    // 5. Short Delay for the "WOW" effect
    setTimeout(() => {
      onStartTrial();
    }, 1800);
  };

  return (
    <div className={`bg-white min-h-screen text-slate-900 font-sans overflow-x-hidden selection:bg-emerald-100 transition-all duration-700 ${isPreparing ? 'blur-md scale-[0.98]' : ''}`}>
      {/* Welcome Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[1000] bg-emerald-950/40 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[56px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] flex flex-col items-center text-center space-y-6 max-w-sm border border-emerald-100 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCircle2 size={48} className="animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Welcome Boss!</h2>
              <p className="text-slate-500 font-bold text-sm uppercase leading-relaxed tracking-tight">
                Preparing your secure <br/> shop environment...
              </p>
            </div>
            <div className="flex gap-2">
               <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200">
            <Store size={20} />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 uppercase italic">NaijaShop<span className="text-emerald-600">App</span></span>
        </div>
        <button 
          onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
          className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 active:scale-95 transition-all border border-emerald-100"
        >
          <MessageCircle size={14} /> Get Support
        </button>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-full text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 shadow-sm animate-bounce">
          <Zap size={14} className="fill-emerald-700" /> Trusted by 1,000+ Nigerian Bosses
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter leading-[0.85] uppercase italic">
          Stop Running Your Shop on <br/>
          <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-8">Paper and Prayer.</span>
        </h1>

        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-lg md:text-xl font-bold text-slate-500 leading-relaxed">
            Tired of staff stealing? Tired of expensive POS data and "Network Failure" alerts? 
            Get the #1 POS that works <span className="text-slate-900 font-black">100% Offline</span> on your Android phone.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={handleStartTrialClick}
              disabled={isPreparing}
              className="w-full sm:w-auto btn-shimmer text-white font-black px-12 py-7 rounded-[32px] text-xl shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                Start 3-Day Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
              {/* Internal glow */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Card Required • Set up in 60 seconds</p>
        </div>
      </section>

      {/* Features & Sections ... (Omitted other sections for brevity, keeping footer) */}

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-slate-50">
        <div className="max-w-lg mx-auto px-6 flex flex-col items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <Store size={18} />
            </div>
            <span className="text-xl font-black italic tracking-tight">NaijaShop<span className="text-emerald-600">App</span></span>
          </div>

          <div className="grid grid-cols-1 w-full gap-4">
             <button onClick={() => onNavigate(Page.HELP_CENTER)} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm active:scale-95 transition-all text-left">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><HelpCircle size={20}/></div>
                   <div>
                     <h4 className="font-black text-xs uppercase tracking-tight">Help Center</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">How-to & Documentation</p>
                   </div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
             </button>
             <button onClick={() => onNavigate(Page.ABOUT_US)} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm active:scale-95 transition-all text-left">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Info size={20}/></div>
                   <div>
                     <h4 className="font-black text-xs uppercase tracking-tight">About Us</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Our Mission & Story</p>
                   </div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
             </button>
             <button onClick={() => onNavigate(Page.AFFILIATES)} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm active:scale-95 transition-all text-left">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Gift size={20}/></div>
                   <div>
                     <h4 className="font-black text-xs uppercase tracking-tight">Affiliate Program</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Earn N2,000 Per Referral</p>
                   </div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
             </button>
          </div>

          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">NaijaShop POS Systems Nigeria 🇳🇬</span>
            </div>
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2025 Local Secure Software Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
