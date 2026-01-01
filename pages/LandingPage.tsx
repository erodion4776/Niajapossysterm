
import React, { useState } from 'react';
import { 
  ShieldCheck, Plane, MessageCircle, Lock, 
  Smartphone, ArrowRight, CheckCircle2, 
  Store, Zap, TrendingUp, AlertCircle, 
  Barcode, Receipt, Wallet, Printer, 
  Clock, ShieldAlert, Users, Landmark,
  BookOpen, Loader2, Sparkles, HelpCircle, Info, Gift, 
  Heart, Globe, X, Scan, Camera, FileText
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAlphaContext)();
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

  return (
    <div className={`bg-white min-h-screen text-slate-900 font-sans overflow-x-hidden selection:bg-emerald-100 transition-all duration-700 ${isPreparing ? 'blur-md scale-[0.98]' : ''}`}>
      {/* SEO/Meta Hints for the App */}
      <div className="hidden">
        <h2>Offline POS Nigeria</h2>
        <h2>Inventory Manager for Pharmacy</h2>
        <h2>Best POS for Boutiques</h2>
      </div>

      {/* Welcome Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[1000] bg-emerald-950/40 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[56px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] flex flex-col items-center text-center space-y-6 max-w-sm border border-emerald-100 animate-in zoom-in">
            <div className="relative">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={48} className="animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Welcome Boss!</h2>
            <p className="text-slate-500 font-bold text-sm uppercase leading-relaxed">Preparing your secure <br/> shop environment...</p>
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
        <div className="hidden md:flex gap-6">
          <button onClick={() => onNavigate(Page.ABOUT_US)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-colors">About</button>
          <button onClick={() => onNavigate(Page.HELP_CENTER)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-colors">Help</button>
          <button onClick={() => onNavigate(Page.AFFILIATES)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-colors">Affiliates</button>
        </div>
        <button 
          onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
          className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-100 active:scale-95 transition-all"
        >
          <MessageCircle size={14} /> Get Support
        </button>
      </nav>

      {/* 1. Hero Section: The Hook */}
      <section className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center space-y-8 animate-in fade-in duration-1000">
        <div className="inline-flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-full text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 shadow-sm animate-bounce">
          <Zap size={14} className="fill-emerald-700" /> Trusted by 1,000+ Nigerian Bosses
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black text-slate-950 tracking-tighter leading-[0.85] uppercase italic">
          Stop the 'Data Tax'. <br/>
          <span className="text-emerald-600">Run 100% Offline.</span>
        </h1>

        <div className="max-w-2xl mx-auto space-y-8">
          <p className="text-xl md:text-2xl font-bold text-slate-500 leading-relaxed">
            Tired of staff stealing? Tired of slow network? Get the #1 POS made for Nigeria. 
            <span className="text-slate-950"> No Internet Needed. No Monthly Fees.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleStartTrialClick}
              disabled={isPreparing}
              className="w-full sm:w-auto btn-shimmer text-white font-black px-12 py-7 rounded-[32px] text-xl shadow-[0_20px_50px_-10px_rgba(5,150,105,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
            >
              Start 3-Day Free Trial <ArrowRight />
            </button>
            <button 
              onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20to%20watch%20the%20demo%20video', '_blank')}
              className="w-full sm:w-auto bg-slate-50 text-slate-600 font-black px-10 py-7 rounded-[32px] text-sm uppercase tracking-widest border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Watch 60s Demo <PlayCircle size={20} />
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Card Required • 60-Second Setup • v2.5 Stable</p>
        </div>
      </section>

      {/* 2. The Airplane Mode Proof */}
      <section className="px-6 py-24 bg-slate-950 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
          <Plane size={400} className="-rotate-12" />
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-400/20">
              <Plane size={14} /> Power of Offline
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter">
              Works Even In <br/>
              <span className="text-blue-400 underline decoration-blue-400/30 underline-offset-8">Airplane Mode.</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              While other POS apps are "Searching for Network", you are already attending to your next customer. 
              Our technology saves everything on your phone first. ZERO data tax.
            </p>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/10">
                 <Zap size={24} />
               </div>
               <p className="text-sm font-bold uppercase tracking-widest italic">Fastest Checkout in the Market</p>
            </div>
          </div>
          <div className="relative group perspective-1000">
             {/* 3D Phone Mockup Placeholder Logic */}
             <div className="w-full aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 rounded-[56px] border-[12px] border-slate-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden transition-transform duration-700 group-hover:rotate-y-12">
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Airplane Mode ON</span>
                   </div>
                   <Plane size={16} className="text-blue-400" />
                </div>
                <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
                   <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                     <CheckCircle2 size={48} className="text-slate-950" />
                   </div>
                   <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black uppercase italic">Sale Successful</h3>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Recorded Offline</p>
                   </div>
                   <div className="w-full bg-white/5 rounded-3xl p-4 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Item: Milo Large</span>
                         <span className="text-[10px] font-black text-emerald-400">₦4,500</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[70%]"></div>
                      </div>
                   </div>
                </div>
             </div>
             {/* Float Elements */}
             <div className="absolute -bottom-8 -left-8 bg-emerald-600 p-6 rounded-[32px] shadow-2xl animate-bounce">
                <ShieldCheck size={32} />
             </div>
          </div>
        </div>
      </section>

      {/* 3. Anti-Theft Vault */}
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

      {/* 4. Smart Shop Features */}
      <section className="px-6 py-24 bg-emerald-950 text-white rounded-[64px] mx-4 mb-24">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter">
                Superpowers <br/>
                <span className="text-emerald-500">For Your Shop.</span>
              </h2>
            </div>
            <p className="text-slate-400 max-w-sm font-medium uppercase text-[10px] tracking-widest leading-loose">
              NaijaShop uses the latest AI technology to make management easy for every Nigerian trader.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Scan />, t: "AI Expiry Scanner", d: "Snap a photo of any drug or product; our AI reads the expiry date automatically and alerts you." },
              { icon: <Landmark />, t: "Soft POS Terminal", d: "Professional transfer screen. No more 'I haven't seen the alert' arguments with customers." },
              { icon: <MessageCircle />, t: "WhatsApp Receipts", d: "Save ₦30,000 on printers. Send professional branded receipts directly to customers." },
              { icon: <TrendingUp />, t: "Inflation Protector", d: "Dollar or Fuel go up? Update all your prices across the entire shop in just 1-click." }
            ].map((f, i) => (
              <div key={i} className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6 hover:bg-white/10 transition-colors">
                 <div className="text-emerald-500">{f.icon}</div>
                 <div className="space-y-2">
                   <h4 className="font-black uppercase italic tracking-tight">{f.t}</h4>
                   <p className="text-slate-400 text-xs leading-relaxed font-medium">{f.d}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Notebook vs. NaijaShop */}
      <section className="px-6 py-24 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
           <h2 className="text-3xl font-black uppercase italic">Upgrade Your Ledger</h2>
           <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Why 1,000+ shops dumped the paper notebook</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-[48px] overflow-hidden shadow-xl">
           <div className="grid grid-cols-2 bg-slate-50 border-b-2 border-slate-100">
              <div className="p-6 text-center border-r-2 border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">The Old Way</p>
                 <h3 className="text-xl font-black text-red-500 uppercase italic">Paper Notebook</h3>
              </div>
              <div className="p-6 text-center">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">The Future</p>
                 <h3 className="text-xl font-black text-emerald-600 uppercase italic">NaijaShop App</h3>
              </div>
           </div>
           {[
             { o: "Easy to lose or tear", n: "Secure WhatsApp Backup" },
             { o: "Staff can lie about sales", n: "PIN Protected & Logged" },
             { o: "Hard to calculate profit", n: "Instant Daily Profit Reports" },
             { o: "No stock alerts", n: "AI Expiry & Low Stock Alerts" },
             { o: "Data connection needed", n: "100% Offline (No Data!)" }
           ].map((r, i) => (
             <div key={i} className="grid grid-cols-2 border-b border-slate-50 last:border-0">
                <div className="p-6 text-center border-r-2 border-slate-100 bg-red-50/20">
                   <p className="text-xs font-bold text-slate-500 leading-tight">❌ {r.o}</p>
                </div>
                <div className="p-6 text-center bg-emerald-50/20">
                   <p className="text-xs font-black text-emerald-700 leading-tight">✅ {r.n}</p>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* 6. Pricing Section */}
      <section className="px-6 py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter">
              Secure Your Shop <br/>
              <span className="text-emerald-600">For 2026.</span>
            </h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Pay once, own it forever. Affordable for every kiosk and pharmacy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-sm space-y-8 flex flex-col justify-between hover:scale-[1.02] transition-transform">
               <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase italic">Annual Support</h3>
                  <p className="text-slate-400 text-sm font-medium">Best for small kiosks and start-ups.</p>
                  <div className="pt-4">
                     <span className="text-5xl font-black tracking-tighter text-slate-900">₦10,000</span>
                     <span className="text-slate-400 font-bold text-sm uppercase ml-2">/ Year</span>
                  </div>
               </div>
               <ul className="space-y-3 pt-6 border-t border-slate-50">
                  <li className="flex items-center gap-3 text-xs font-bold text-slate-600"><CheckCircle2 className="text-emerald-500" size={16}/> 12 Months Access</li>
                  <li className="flex items-center gap-3 text-xs font-bold text-slate-600"><CheckCircle2 className="text-emerald-500" size={16}/> Unlimited Stock</li>
                  <li className="flex items-center gap-3 text-xs font-bold text-slate-600"><CheckCircle2 className="text-emerald-500" size={16}/> Basic Support</li>
               </ul>
               <button onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20the%20Annual%20License%20for%2010k', '_blank')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">Secure My Shop</button>
            </div>

            <div className="bg-emerald-600 p-12 rounded-[56px] shadow-2xl shadow-emerald-200 space-y-8 flex flex-col justify-between relative overflow-hidden text-white hover:scale-[1.05] transition-transform">
               <div className="absolute top-0 right-0 bg-white/20 px-6 py-2 rounded-bl-3xl font-black uppercase tracking-widest text-[8px] italic">Most Popular</div>
               <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase italic">Lifetime Pro</h3>
                  <p className="text-emerald-100/60 text-sm font-medium">Pay once, own forever. No more fees.</p>
                  <div className="pt-4">
                     <span className="text-5xl font-black tracking-tighter">₦25,000</span>
                     <span className="text-emerald-200/60 font-bold text-sm uppercase ml-2">Once</span>
                  </div>
               </div>
               <ul className="space-y-3 pt-6 border-t border-white/10">
                  <li className="flex items-center gap-3 text-xs font-bold"><CheckCircle2 className="text-white" size={16}/> Forever Access</li>
                  <li className="flex items-center gap-3 text-xs font-bold"><CheckCircle2 className="text-white" size={16}/> All Pro Features</li>
                  <li className="flex items-center gap-3 text-xs font-bold"><CheckCircle2 className="text-white" size={16}/> 24/7 Priority WhatsApp</li>
                  <li className="flex items-center gap-3 text-xs font-bold"><CheckCircle2 className="text-white" size={16}/> Inventory Cloning</li>
               </ul>
               <button onClick={() => window.open('https://wa.me/2347062228026?text=I%20want%20the%20Lifetime%20License%20for%2025k', '_blank')} className="w-full py-5 bg-white text-emerald-950 rounded-3xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-xl shadow-emerald-900/20">Secure My Shop Forever</button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Trust-Building Footer */}
      <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"><Store size={20} /></div>
                <span className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">NaijaShop<span className="text-emerald-600">App</span></span>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                The world's most powerful offline-first POS system built specifically for the Nigerian market. Ending the Data Tax for SMEs.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => window.open('https://wa.me/2347062228026', '_blank')}
                  className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle size={24} />
                </button>
                <div className="space-y-0.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Support</p>
                   <p className="text-sm font-black text-slate-800">07062228026</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Resources</h4>
               <ul className="space-y-4">
                 <li><button onClick={() => onNavigate(Page.HELP_CENTER)} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">Help Center</button></li>
                 <li><button onClick={() => onNavigate(Page.ABOUT_US)} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">About Us</button></li>
                 <li><button onClick={() => onNavigate(Page.AFFILIATES)} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">Affiliate Program</button></li>
                 <li><button onClick={() => window.open('https://wa.me/2347062228026', '_blank')} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">Contact Support</button></li>
               </ul>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Earn Cash</h4>
               <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 space-y-4">
                  <div className="flex items-center gap-3">
                     <Gift className="text-amber-600" size={20} />
                     <p className="text-xs font-black text-amber-900 uppercase italic">Get ₦2,000</p>
                  </div>
                  <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">Invite another shop owner and get paid instantly via Bank Transfer.</p>
                  <button onClick={() => onNavigate(Page.AFFILIATES)} className="text-[9px] font-black text-amber-600 uppercase tracking-widest underline decoration-amber-200">Join Growth Team</button>
               </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">NaijaShop Nigeria POS Systems 🇳🇬</span>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">© 2025 Local Secure Software Solutions • v2.5.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PlayCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);
