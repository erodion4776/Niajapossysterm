
import React, { useState } from 'react';
import { 
  ShieldCheck, Plane, MessageCircle, Lock, 
  Smartphone, ArrowRight, CheckCircle2, 
  Store, Zap, TrendingUp, AlertCircle, 
  Barcode, Receipt, Wallet, Printer, 
  Clock, ShieldAlert, Users, Landmark,
  BookOpen, Loader2, Sparkles, HelpCircle, Info, Gift, Heart, Globe
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
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  };

  const handleStartTrialClick = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#fbbf24', '#ffffff'] });
    playChime();
    setIsPreparing(true);
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', Date.now().toString());
    setTimeout(() => { onStartTrial(); }, 1800);
  };

  return (
    <div className={`bg-white min-h-screen text-slate-900 font-sans overflow-x-hidden transition-all duration-700 ${isPreparing ? 'blur-md scale-[0.98]' : ''}`}>
      {/* Welcome Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[1000] bg-emerald-950/40 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[56px] shadow-2xl flex flex-col items-center text-center space-y-6 max-w-sm border border-emerald-100 animate-in zoom-in">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={48} className="animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase">Welcome Boss!</h2>
            <p className="text-slate-500 font-bold text-sm uppercase leading-relaxed">Preparing your secure <br/> shop environment...</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"><Store size={20} /></div>
          <span className="text-xl font-black tracking-tight text-slate-900 uppercase italic">NaijaShop<span className="text-emerald-600">App</span></span>
        </div>
        <button onClick={() => window.open('https://wa.me/2347062228026', '_blank')} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-100">
          <MessageCircle size={14} /> Get Support
        </button>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-full text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 animate-bounce">
          <Zap size={14} className="fill-emerald-700" /> Trusted by 1,000+ Nigerian Bosses
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter leading-[0.85] uppercase italic">
          Stop Running Your Shop on <br/>
          <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-8">Paper and Prayer.</span>
        </h1>
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-lg md:text-xl font-bold text-slate-500 leading-relaxed">
            Stop staff theft. Stop "Network Failure" alerts. 
            Get the #1 POS that works <span className="text-slate-900 font-black">100% Offline</span> on your phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button onClick={handleStartTrialClick} disabled={isPreparing} className="w-full sm:w-auto btn-shimmer text-white font-black px-12 py-7 rounded-[32px] text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
              Start 3-Day Free Trial <ArrowRight />
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Card Required • 60-Second Setup</p>
        </div>
      </section>

      {/* The 4 Pillars */}
      <section className="px-6 py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center"><Plane size={28}/></div>
            <h3 className="text-xl font-black uppercase italic">Works in Airplane Mode</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Network fail? No problem. Record sales, check stock, and manage debts without internet or data tax.</p>
          </div>
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center"><Lock size={28}/></div>
            <h3 className="text-xl font-black uppercase italic">Anti-Theft Security</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Lock your profits behind a secret Admin PIN. Staff can sell, but only YOU can delete records or see total profits.</p>
          </div>
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center"><Landmark size={28}/></div>
            <h3 className="text-xl font-black uppercase italic">Digital Soft POS</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Accept bank transfers like a pro. Show your bank details on-screen and verify alerts directly in the app.</p>
          </div>
          <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center"><AlertCircle size={28}/></div>
            <h3 className="text-xl font-black uppercase italic">Expiry Date AI</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Scan products with your camera to detect expiry dates. Get alerts before items spoil to save money.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 max-w-lg mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black uppercase italic">Affordable for every shop</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Pay once, own it forever.</p>
        </div>
        <div className="space-y-6">
          <div className="bg-white border-2 border-emerald-500 p-8 rounded-[48px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest">Most Popular</div>
            <h3 className="text-xl font-black uppercase">Lifetime Access</h3>
            <p className="text-4xl font-black mt-2">₦25,000</p>
            <ul className="mt-6 space-y-3">
               <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle2 className="text-emerald-500" size={16}/> Never pay again</li>
               <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle2 className="text-emerald-500" size={16}/> All features unlocked</li>
               <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle2 className="text-emerald-500" size={16}/> 24/7 Priority Support</li>
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-8 rounded-[48px] shadow-sm">
            <h3 className="text-xl font-black uppercase">Yearly License</h3>
            <p className="text-4xl font-black mt-2">₦10,000</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Renews every 12 months</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-slate-50">
        <div className="max-w-lg mx-auto px-6 flex flex-col items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white"><Store size={18} /></div>
            <span className="text-xl font-black italic tracking-tight">NaijaShop<span className="text-emerald-600">App</span></span>
          </div>
          <div className="grid grid-cols-1 w-full gap-4">
             <button onClick={() => onNavigate(Page.HELP_CENTER)} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm active:scale-95 transition-all text-left">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><HelpCircle size={20}/></div>
                   <div><h4 className="font-black text-xs uppercase">Help Center</h4><p className="text-[10px] font-bold text-slate-400 uppercase">Guides & FAQ</p></div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
             </button>
             <button onClick={() => onNavigate(Page.ABOUT_US)} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm active:scale-95 transition-all text-left">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Info size={20}/></div>
                   <div><h4 className="font-black text-xs uppercase">About Us</h4><p className="text-[10px] font-bold text-slate-400 uppercase">Mission & Story</p></div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
             </button>
             <button onClick={() => onNavigate(Page.AFFILIATES)} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm active:scale-95 transition-all text-left">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Gift size={20}/></div>
                   <div><h4 className="font-black text-xs uppercase">Affiliate Program</h4><p className="text-[10px] font-bold text-slate-400 uppercase">Earn N2,000 per referral</p></div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
             </button>
          </div>
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">NaijaShop Nigeria 🇳🇬</span>
            </div>
            <p className="text-[9px] font-bold text-slate-300 uppercase">© 2025 Local Secure Software Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
