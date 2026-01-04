
import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { 
  ShieldCheck, Plane, MessageCircle, Lock, 
  Smartphone, ArrowRight, CheckCircle2, 
  Store, Zap, TrendingUp, AlertCircle, 
  Receipt, Wallet, Landmark, BookOpen, 
  Scan, PlayCircle, ShieldAlert, FileText, X,
  Share, PlusSquare, Compass, ChevronDown, ChevronUp,
  Globe, Coins, Target, Users, Gem
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Page } from '../types.ts';

interface LandingPageProps {
  onStartTrial: () => void;
  onNavigate: (page: Page) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTrial, onNavigate }) => {
  const [isPreparing, setIsPreparing] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showStickyBanner, setShowStickyBanner] = useState(false);

  useEffect(() => {
    // REFERRAL TRACKING LOGIC
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('naija_ref_source', refCode.toUpperCase());
      // Clean up URL to look professional
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsIOS(isApple);
    setIsStandalone(standalone);

    const timer = setTimeout(() => {
      if (!standalone) setShowStickyBanner(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartTrialClick = () => {
    ReactGA.event({
      category: "Conversion",
      action: "Trial Started",
      label: "Landing Page Big Hook"
    });

    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: ['#10b981', '#fbbf24', '#ffffff'],
      gravity: 1.2,
      scalar: 1.2
    });
    
    // Atomic Initialization of Trial State
    const now = Date.now().toString();
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', now);
    localStorage.setItem('is_setup_pending', 'true');
    localStorage.setItem('device_role', 'Owner');

    setIsPreparing(true);
    
    // Hard refresh to trigger App.tsx router logic with new storage state
    setTimeout(() => { 
      window.location.href = '/app';
    }, 1500);
  };

  return (
    <div className="bg-white min-h-screen text-emerald-950 font-sans selection:bg-emerald-100 overflow-x-hidden">
      
      {/* 1. THE BIG HOOK HERO SECTION */}
      <section className="relative bg-emerald-950 text-white px-6 pt-16 pb-24 overflow-hidden border-b-4 border-emerald-500/20">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-700/10 blur-[120px] -ml-48 -mb-48 rounded-full"></div>

        <nav className="relative z-10 max-w-5xl mx-auto flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-xl text-emerald-950 shadow-lg shadow-emerald-500/20"><Store size={20} /></div>
            <span className="text-xl font-black tracking-tight uppercase italic">NaijaShop<span className="text-emerald-500">App</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-emerald-400/60">
            <button onClick={() => onNavigate(Page.ABOUT_US)} className="hover:text-emerald-400 transition-colors">About</button>
            <button onClick={() => onNavigate(Page.AFFILIATES)} className="hover:text-emerald-400 transition-colors">Affiliates</button>
            <button onClick={() => onNavigate(Page.HELP_CENTER)} className="hover:text-emerald-400 transition-colors">Help</button>
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-5 py-2.5 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] border border-emerald-500/20 shadow-xl backdrop-blur-md">
            <Zap size={14} className="fill-emerald-400 animate-pulse" /> Stop the "Data Tax" Today
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase italic drop-shadow-2xl">
            Stop Staff Theft. <br/>
            Run Your Shop <br/>
            <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">100% Offline.</span>
          </h1>

          <p className="text-xl md:text-2xl font-bold text-emerald-100/60 leading-relaxed max-w-2xl mx-auto">
            NaijaShop is the only Digital Manager that works without internet. No Monthly Fees. No Network Issues. No Stress.
          </p>

          <div className="pt-8 flex flex-col items-center gap-6">
            <button 
              onClick={handleStartTrialClick}
              className="w-full sm:w-auto bg-emerald-500 text-emerald-950 font-black px-12 py-7 rounded-[32px] text-xl shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group btn-shimmer"
            >
              START MY 14-DAY FREE TRIAL <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[11px] font-black text-emerald-400/40 uppercase tracking-[0.4em]">
              Use it for 2 full weeks for FREE. See your profit grow before you pay a kobo.
            </p>
          </div>
        </div>
      </section>

      {/* 2. THE "AIRPLANE MODE" PROOF */}
      <section className="px-6 py-24 bg-slate-50 border-b border-slate-100 overflow-hidden">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
              <Plane size={14} /> The Power of Offline
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-emerald-950 uppercase italic leading-[0.9] tracking-tighter">
              Works even in <br/>
              <span className="text-blue-500">Airplane Mode.</span>
            </h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              You don't need to buy data to record sales. While other POS apps are "Searching for Network", you are already attending to your next customer. Everything saves on your phone instantly.
            </p>
          </div>
          
          <div className="relative group">
             <div className="w-full aspect-[4/5] bg-emerald-950 rounded-[56px] border-[12px] border-emerald-900 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-8">
                {/* Airplane UI Mockup */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-white/5 backdrop-blur-md">
                   <div className="flex items-center gap-2 text-blue-400">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest">AIRPLANE MODE ON</span>
                   </div>
                   <Plane size={16} className="text-blue-400" />
                </div>
                
                <div className="space-y-6 text-center animate-in zoom-in duration-1000">
                   <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 size={48} className="text-emerald-950" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-white text-2xl font-black uppercase italic">Sale Success!</h3>
                      <p className="text-emerald-400/60 font-bold text-xs uppercase tracking-widest">Saved Offline</p>
                   </div>
                   <div className="bg-white/5 border border-white/10 p-5 rounded-3xl w-full">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Rice & Oil Combo</span>
                         <span className="text-[10px] font-black text-emerald-400">₦12,500</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-full"></div>
                      </div>
                   </div>
                </div>
             </div>
             {/* Floating Badge */}
             <div className="absolute -bottom-8 -right-4 bg-white p-6 rounded-[32px] shadow-2xl border border-slate-100 animate-bounce">
                <ShieldCheck size={32} className="text-emerald-600" />
             </div>
          </div>
        </div>
      </section>

      {/* 3. THE "BOSS" FEATURES */}
      <section className="px-6 py-24 max-w-5xl mx-auto space-y-20">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-black text-emerald-950 uppercase italic leading-[0.9] tracking-tighter">
            Stop Trading <br/>
            <span className="text-emerald-600">In The Dark.</span>
          </h2>
          <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Simple Tools for the Modern Nigerian Oga</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 hover:border-emerald-200 transition-all group flex flex-col gap-6">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-all duration-500">
                <Lock size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic text-emerald-950 mb-3">Staff Anti-Theft Lock</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Staff can sell, but they cannot delete records or see your gain. Only YOU have the secret PIN. Finally, sleep well knowing your money is safe.
                </p>
              </div>
           </div>

           <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 hover:border-emerald-200 transition-all group flex flex-col gap-6">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-all duration-500">
                <MessageCircle size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic text-emerald-950 mb-3">WhatsApp Receipts</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Save ₦30,000 on printers and ink. Send professional text receipts to customers' WhatsApp in one click. Looks better, costs zero.
                </p>
              </div>
           </div>

           <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 hover:border-emerald-200 transition-all group flex flex-col gap-6">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-all duration-500">
                <Landmark size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic text-emerald-950 mb-3">The Transfer Terminal</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Show your bank details professionally on your screen. No more "I haven't seen the alert" arguments. Confirm with confidence.
                </p>
              </div>
           </div>

           <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 hover:border-emerald-200 transition-all group flex flex-col gap-6">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-all duration-500">
                <Scan size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic text-emerald-950 mb-3">AI Expiry Scanner</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Point your camera at any product. The app reads the date and warns you before you lose money. No more discovering expired goods too late.
                </p>
              </div>
           </div>
        </div>
      </section>

      {/* 4. ABOUT NAIJASHOP (TRUST) */}
      <section className="px-6 py-24 bg-emerald-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
           <div className="relative">
              <div className="w-full aspect-video rounded-[48px] overflow-hidden shadow-2xl relative">
                 <img src="https://i.ibb.co/TD1JLFvQ/Generated-Image-September-24-2025-3-37-AM.png" alt="Developer" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 to-transparent"></div>
                 <div className="absolute bottom-8 left-8">
                    <p className="text-white font-black text-xl uppercase italic">Built in Nigeria.</p>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">For the Nigerian Boss.</p>
                 </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white p-4 rounded-2xl shadow-xl">
                 <ShieldCheck size={32} className="text-emerald-600" />
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-4xl font-black text-emerald-950 uppercase italic leading-[1.1] tracking-tighter">
                We know the <br/> <span className="text-emerald-600">Naija struggle.</span>
              </h2>
              <p className="text-slate-600 font-medium leading-relaxed">
                We are tired of seeing Ogas struggle with bad network and staff "mistakes". We built NaijaShop to give you total control of your business. Your data stays on your phone—we don't even see your sales.
              </p>
              <button 
                onClick={() => onNavigate(Page.ABOUT_US)}
                className="inline-flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest hover:gap-4 transition-all"
              >
                Read Our Full Story <ArrowRight size={16} />
              </button>
           </div>
        </div>
      </section>

      {/* 5. REFER & EARN (AFFILIATE) */}
      <section className="px-6 py-24 bg-emerald-950 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
            <Coins size={400} className="rotate-12" />
         </div>
         
         <div className="max-w-5xl mx-auto text-center space-y-10 relative z-10">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter">
                Make <span className="text-emerald-500">₦2,000</span> <br/>
                For Every Referral!
              </h2>
              <p className="text-emerald-100/60 text-lg font-bold max-w-xl mx-auto">
                Do you know another shop owner? Show them NaijaShop. When they pay for a license, we send ₦2,000 to your bank account instantly. No registration fee!
              </p>
            </div>
            
            <button 
              onClick={() => onNavigate(Page.AFFILIATES)}
              className="bg-white text-emerald-950 font-black px-10 py-6 rounded-[32px] uppercase tracking-tighter text-sm shadow-2xl active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              Learn How to Join the Team <Users size={18} />
            </button>
         </div>
      </section>

      {/* 6. SIMPLE PRICING */}
      <section className="px-6 py-24 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-black text-emerald-950 uppercase italic leading-[0.9] tracking-tighter">
            Transparent <br/>
            <span className="text-emerald-600">Pricing.</span>
          </h2>
          <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">New Year 2026 Special Offer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
           {/* Annual */}
           <div className="bg-slate-50 p-12 rounded-[56px] border border-slate-100 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase italic text-slate-400">Annual Support</h3>
                <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black text-emerald-950 tracking-tighter">₦10,000</span>
                   <span className="text-slate-400 font-bold text-xs uppercase">/ Year</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Best for small kiosks looking to digitize cheaply.</p>
              </div>
              <button onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20the%20Annual%20License', '_blank')} className="w-full py-5 bg-white text-emerald-950 border border-slate-200 rounded-3xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">Select Annual</button>
           </div>

           {/* Lifetime */}
           <div className="bg-emerald-600 p-12 rounded-[56px] shadow-2xl shadow-emerald-500/30 flex flex-col justify-between space-y-8 relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 bg-white/20 px-4 py-2 rounded-bl-3xl font-black uppercase text-[8px] tracking-widest italic">Best Value</div>
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase italic text-emerald-100">Lifetime Pro</h3>
                <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black tracking-tighter">₦25,000</span>
                   <span className="text-emerald-200 font-bold text-xs uppercase">Once</span>
                </div>
                <p className="text-emerald-50 text-sm font-medium">Pay once, own forever. The choice of smart Ogas across Nigeria.</p>
              </div>
              <button onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20the%20Lifetime%20License', '_blank')} className="w-full py-5 bg-white text-emerald-950 rounded-3xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-xl">Secure my 2026 Profit</button>
           </div>
        </div>
      </section>

      {/* 7. ONLINE HELP CENTER (FAQ) */}
      <section className="px-6 py-24 bg-slate-50">
         <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black uppercase italic text-emerald-950">Have Questions?</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick answers for busy people</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-3">
                  <h4 className="font-black text-emerald-950 uppercase italic text-sm">"What if I lose my phone?"</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">Your WhatsApp backup saves everything. Just install the app on a new phone and import your file. All your records come back in 5 seconds.</p>
               </div>
               <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-3">
                  <h4 className="font-black text-emerald-950 uppercase italic text-sm">"Does it work on my phone?"</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">Yes! NaijaShop works on any smartphone—Android or iPhone. As long as you have a browser like Chrome or Safari, you are good to go.</p>
               </div>
            </div>

            <button 
              onClick={() => onNavigate(Page.HELP_CENTER)}
              className="w-full bg-emerald-950 p-10 rounded-[48px] flex items-center justify-between text-white group active:scale-[0.98] transition-all shadow-2xl"
            >
               <div className="flex items-center gap-6 text-left">
                  <div className="p-4 bg-emerald-500 rounded-[28px] text-emerald-950"><Globe size={32} /></div>
                  <div>
                     <h3 className="text-2xl font-black uppercase italic">Visit Our Online Help Center</h3>
                     <p className="text-emerald-500/60 text-[10px] font-bold uppercase tracking-[0.2em]">Step-by-step guides & Video tutorials</p>
                  </div>
               </div>
               <ArrowRight size={24} className="text-emerald-500 group-hover:translate-x-2 transition-transform" />
            </button>
         </div>
      </section>

      {/* 8. INSTALL APP REMINDER (BANNER) */}
      {!isStandalone && showStickyBanner && (
        <div className="fixed bottom-6 left-6 right-6 z-[2000] animate-in slide-in-from-bottom-10 duration-700 max-w-md mx-auto">
           <div className="bg-emerald-950 text-white p-5 rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex items-center justify-between border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-emerald-950 shadow-inner">
                   <Smartphone size={24} />
                </div>
                <div>
                   <p className="text-xs font-black uppercase italic">NaijaShop App</p>
                   <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Install for 100% Offline Power</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowStickyBanner(false); handleStartTrialClick(); }}
                className="bg-emerald-500 text-emerald-950 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-90 transition-all shadow-lg"
              >
                INSTALL
              </button>
              <button onClick={() => setShowStickyBanner(false)} className="ml-2 text-white/20 hover:text-white"><X size={18}/></button>
           </div>
        </div>
      )}

      {/* 9. PROFESSIONAL FOOTER */}
      <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
               <div className="flex items-center gap-2">
                 <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"><Store size={20} /></div>
                 <span className="text-2xl font-black tracking-tight text-emerald-950 uppercase italic">NaijaShop<span className="text-emerald-600">App</span></span>
               </div>
               <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                 Digitizing the Nigerian market since 2025. Built to stop the Data Tax and protect local shop owners.
               </p>
               <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-fit">
                  <MessageCircle size={18} className="text-emerald-600" />
                  <span className="text-xs font-black text-emerald-950 tracking-tight">Support: 07062228026</span>
               </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Quick Links</h4>
               <div className="flex flex-col gap-4 text-sm font-bold text-slate-500">
                  <button onClick={() => onNavigate(Page.ABOUT_US)} className="text-left hover:text-emerald-600">About Us</button>
                  <button onClick={() => onNavigate(Page.AFFILIATES)} className="text-left hover:text-emerald-600">Affiliate Team</button>
                  <button onClick={() => onNavigate(Page.HELP_CENTER)} className="text-left hover:text-emerald-600">Help Center</button>
                  <button className="text-left hover:text-emerald-600 opacity-50 cursor-default">Privacy Policy</button>
               </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-2 opacity-30">
               <ShieldCheck size={16} className="text-emerald-600" />
               <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-900">Secure POS Systems Nigeria 🇳🇬</p>
             </div>
             <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest">© 2025 Local Secure Software Solutions</p>
          </div>
        </div>
      </footer>

      {/* Preparing Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-emerald-950 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-emerald-500/20 rounded-[40px] flex items-center justify-center mb-8 border border-emerald-500/30 animate-pulse">
              <Store size={48} className="text-emerald-500" />
           </div>
           <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter animate-in slide-in-from-bottom duration-500">Starting Onboarding...</h2>
           <div className="mt-8 flex gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></div>
           </div>
        </div>
      )}
    </div>
  );
};
