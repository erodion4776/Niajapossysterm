
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plane, MessageCircle, Lock, 
  Smartphone, ArrowRight, CheckCircle2, 
  Store, Zap, TrendingUp, AlertCircle, 
  Receipt, Wallet, Landmark, BookOpen, 
  Scan, PlayCircle, ShieldAlert, FileText, X,
  Share, PlusSquare, Compass, ChevronDown, ChevronUp
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // 1. iOS Device Detection Logic
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    setIsIOS(isApple);
    setIsStandalone(standalone);
  }, []);

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
    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: ['#10b981', '#fbbf24', '#ffffff'],
      gravity: 1.2,
      scalar: 1.2
    });
    playChime();
    setIsPreparing(true);
    localStorage.setItem('is_trialing', 'true');
    localStorage.setItem('trial_start_date', Date.now().toString());
    setTimeout(() => { onStartTrial(); }, 1800);
  };

  const faqs = [
    {
      q: "Does this app really work without internet?",
      a: "Yes! You only need internet once to activate the app. After that, you can sell in Airplane Mode. All data is saved directly on your phone's memory (IndexedDB)."
    },
    {
      q: "Are there any monthly charges?",
      a: "No. Once you pay the activation fee, the app is yours forever. You never have to pay another kobo. No subscriptions, no data tax."
    },
    {
      q: "Can I print receipts from my iPhone?",
      a: "NaijaShop supports WhatsApp Receipts on all devices including iPhone. However, physical Bluetooth Printing is currently only supported on Android devices due to Apple's system restrictions. For physical printing, we recommend using a secondary Android device in your shop."
    },
    {
      q: "What happens if I lose my phone?",
      a: "This is why daily backup is vital. You can install the app on a new phone, import your WhatsApp backup file, and all your records will be restored instantly."
    }
  ];

  return (
    <div className={`bg-white min-h-screen text-emerald-950 font-sans overflow-x-hidden selection:bg-emerald-100 transition-all duration-700 ${isPreparing ? 'blur-md scale-[0.98]' : ''}`}>
      {/* Meta Hints for SEO */}
      <div className="hidden" aria-hidden="true">
        <h1>Offline POS Nigeria - Best Inventory Manager for Pharmacy & Boutiques</h1>
        <p>NaijaShop POS is the top-rated offline inventory and sales manager for Nigerian SMEs. No internet needed, zero monthly fees.</p>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 pt-12 pb-24 max-w-5xl mx-auto text-center space-y-8 animate-in fade-in duration-1000">
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"><Store size={20} /></div>
            <span className="text-xl font-black tracking-tight text-emerald-950 uppercase italic">NaijaShop<span className="text-emerald-600">App</span></span>
          </div>
          <button 
            onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
            className="hidden sm:flex text-emerald-600 font-black text-[10px] uppercase tracking-widest items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-100"
          >
            <MessageCircle size={14} /> 07062228026
          </button>
        </nav>

        <div className="inline-flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-full text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 shadow-sm">
          <Zap size={14} className="fill-emerald-700 animate-pulse" /> Verified Offline Technology
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black text-emerald-950 tracking-tighter leading-[0.85] uppercase italic">
          Stop the 'Data Tax'. <br/>
          <span className="text-emerald-600">Run Your Shop <br/> 100% Offline.</span>
        </h1>

        <div className="max-w-2xl mx-auto space-y-10">
          <p className="text-xl md:text-2xl font-bold text-slate-500 leading-relaxed">
            Tired of staff stealing? Tired of slow network? Get the #1 POS made for Nigeria. 
            <span className="text-emerald-950"> No Internet Needed. No Monthly Fees.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleStartTrialClick}
              disabled={isPreparing}
              className="w-full sm:w-auto bg-emerald-600 text-white font-black px-12 py-7 rounded-[32px] text-xl shadow-[0_20px_50px_-10px_rgba(5,150,105,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group animate-bounce"
            >
              Start 3-Day Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20to%20watch%20the%20demo%20video', '_blank')}
              className="w-full sm:w-auto bg-slate-50 text-slate-600 font-black px-10 py-7 rounded-[32px] text-sm uppercase tracking-widest border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Watch 60s Demo <PlayCircle size={20} />
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Card Required • Set up in 60 seconds</p>
        </div>
      </section>

      {/* 2. The "iPhone Install" Section */}
      {isIOS && !isStandalone && (
        <section className="px-6 py-16 bg-emerald-50 rounded-[64px] mx-4 mb-24 animate-in slide-in-from-bottom duration-700">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
               <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                 <Compass size={32} />
               </div>
               <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">Install on iPhone <br/><span className="text-emerald-600 text-2xl md:text-3xl">in 3 Simple Steps</span></h2>
               <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">Apple doesn't allow one-tap install. Follow this guide to work offline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[40px] border border-emerald-100 space-y-4 shadow-sm">
                 <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black italic">01</div>
                 <h4 className="font-black uppercase italic text-sm text-emerald-900">Open Safari</h4>
                 <p className="text-slate-500 text-xs leading-relaxed font-medium">Ensure you are viewing this page in the <span className="font-bold text-emerald-950">Safari browser</span>. Other browsers won't work.</p>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-emerald-100 space-y-4 shadow-sm">
                 <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black italic">02</div>
                 <h4 className="font-black uppercase italic text-sm text-emerald-900">Tap Share</h4>
                 <p className="text-slate-500 text-xs leading-relaxed font-medium flex items-center gap-1.5 flex-wrap">
                   Tap the <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-emerald-950 font-bold"><Share size={12}/> Share</span> button at the bottom center of Safari.
                 </p>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-emerald-100 space-y-4 shadow-sm">
                 <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black italic">03</div>
                 <h4 className="font-black uppercase italic text-sm text-emerald-900">Add to Home</h4>
                 <p className="text-slate-500 text-xs leading-relaxed font-medium flex items-center gap-1.5 flex-wrap">
                   Scroll down and tap <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-emerald-950 font-bold"><PlusSquare size={12}/> Add to Home Screen</span>.
                 </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Airplane Mode Proof */}
      <section className="px-6 py-24 bg-emerald-950 text-white overflow-hidden relative">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-400/20">
              <Plane size={14} /> Power of Offline
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter">
              Works Even In <br/>
              <span className="text-blue-400 underline decoration-blue-400/30 underline-offset-8">Airplane Mode.</span>
            </h2>
            <p className="text-emerald-100/60 text-lg font-medium leading-relaxed">
              While other POS apps are "Searching for Network", you are already attending to your next customer. 
              Our technology saves everything on your phone memory first. ZERO data cost.
            </p>
          </div>
          
          <div className="relative group perspective-1000">
             <div className="w-full aspect-[4/5] bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-[56px] border-[12px] border-emerald-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden transition-transform duration-700 group-hover:rotate-y-12">
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-emerald-900/50 backdrop-blur-md">
                   <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Airplane Mode ON</span>
                   </div>
                   <Plane size={16} className="text-blue-400" />
                </div>
                <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
                   <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                     <CheckCircle2 size={48} className="text-emerald-950" />
                   </div>
                   <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black uppercase italic">Sale Successful</h3>
                      <p className="text-emerald-500/50 font-bold uppercase text-[10px] tracking-widest">Saved Securely Offline</p>
                   </div>
                   <div className="w-full bg-white/5 rounded-3xl p-5 border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-[10px] font-bold text-emerald-500/60 uppercase">Item: Milo Large</span>
                         <span className="text-[10px] font-black text-emerald-400">₦4,500</span>
                      </div>
                      <div className="h-1.5 w-full bg-emerald-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[100%] transition-all duration-1000"></div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="absolute -bottom-8 -left-8 bg-emerald-600 p-6 rounded-[32px] shadow-2xl animate-bounce">
                <ShieldCheck size={32} />
             </div>
          </div>
        </div>
      </section>

      {/* Anti-Theft Vault */}
      <section className="px-6 py-24 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter">
            Sleep Better. <br/>
            <span className="text-emerald-600">Your Profit is Locked.</span>
          </h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Designed for the Shop Owner, not just the Staff.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { icon: <Lock className="text-red-500" />, t: "Staff Lock", d: "Staff can record sales but they CANNOT delete transactions, change prices, or see your total shop profit. You are the boss." },
             { icon: <ShieldAlert className="text-amber-500" />, t: "Admin PIN", d: "Your money dashboard is hidden behind a secret 4-digit PIN. Only you know how much the shop made today." },
             { icon: <FileText className="text-blue-500" />, t: "Stock Logs", d: "Track every single movement. If an item is added or removed manually, the app logs WHO did it and WHEN. No more missing stock." }
           ].map((v, i) => (
             <div key={i} className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 hover:border-emerald-200 transition-all group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                  {v.icon}
                </div>
                <h3 className="text-xl font-black uppercase italic mb-3">{v.t}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{v.d}</p>
             </div>
           ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-24 max-w-4xl mx-auto space-y-12">
        <div className="text-center">
           <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">Common <span className="text-emerald-600">Questions</span></h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border-2 border-slate-50 rounded-[32px] overflow-hidden shadow-sm transition-all hover:shadow-md">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-8 text-left flex justify-between items-center gap-4"
              >
                <span className="font-black text-sm md:text-base uppercase tracking-tight text-emerald-950 leading-tight">{faq.q}</span>
                {openFaq === i ? <ChevronUp size={20} className="text-slate-300 shrink-0" /> : <ChevronDown size={20} className="text-slate-300 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-8 pb-8 animate-in slide-in-from-top duration-300">
                  <p className="text-sm md:text-base font-medium text-slate-500 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                    "{faq.a}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter">
              New Year <span className="text-emerald-500">2026 Pricing.</span>
            </h2>
            <p className="text-emerald-100/40 font-bold text-xs uppercase tracking-widest">Pay once, own it forever. No monthly subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white/5 p-12 rounded-[56px] border border-white/10 space-y-8 flex flex-col justify-between">
               <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase italic">Annual Support</h3>
                  <div className="pt-4"><span className="text-5xl font-black tracking-tighter">₦10,000</span><span className="text-white/40 font-bold text-sm uppercase ml-2">/ Year</span></div>
                  <p className="text-white/40 text-sm font-medium">Best for small kiosks and kiosks.</p>
               </div>
               <button onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20the%20Annual%20License%20for%2010k', '_blank')} className="w-full py-5 bg-white/10 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">Select Annual</button>
            </div>

            <div className="bg-emerald-600 p-12 rounded-[56px] shadow-2xl shadow-emerald-600/40 space-y-8 flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-white/20 px-6 py-2 rounded-bl-3xl font-black uppercase tracking-widest text-[8px] italic">Most Popular</div>
               <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase italic">Lifetime Professional</h3>
                  <div className="pt-4"><span className="text-5xl font-black tracking-tighter">₦25,000</span><span className="text-white/60 font-bold text-sm uppercase ml-2">Once</span></div>
                  <p className="text-white/80 text-sm font-medium">Pay once, own forever. No more fees.</p>
               </div>
               <button onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20to%20Secure%20My%20Shop%20for%202026%20with%20the%20Lifetime%20License', '_blank')} className="w-full py-5 bg-white text-emerald-950 rounded-3xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-xl">Secure My Shop for 2026</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"><Store size={20} /></div>
                <span className="text-2xl font-black tracking-tight text-emerald-950 uppercase italic">NaijaShop<span className="text-emerald-600">App</span></span>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed max-w-sm">Built specifically for the Nigerian market. Ending the Data Tax for local SMEs since 2025.</p>
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Developer Contact</p>
                 <p className="text-lg font-black text-emerald-950">07062228026</p>
              </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-[0.3em]">Quick Links</h4>
               <ul className="space-y-4">
                 <li><button onClick={() => onNavigate(Page.HELP_CENTER)} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">Help Center</button></li>
                 <li><button onClick={() => onNavigate(Page.ABOUT_US)} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">About Us</button></li>
                 <li><button onClick={() => onNavigate(Page.AFFILIATES)} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">Affiliate Program</button></li>
               </ul>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-[0.3em]">Join Growth Team</h4>
               <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 space-y-3">
                  <p className="text-xs font-black text-emerald-900 uppercase italic">Earn ₦2,000</p>
                  <p className="text-[10px] font-bold text-emerald-700 leading-relaxed">Invite another shop owner and get paid via Bank Transfer.</p>
                  <button onClick={() => onNavigate(Page.AFFILIATES)} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest underline underline-offset-4">Learn More</button>
               </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">NaijaShop POS Nigeria 🇳🇬</span>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">© 2025 Local Secure Software Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
