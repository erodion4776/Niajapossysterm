
import React, { useState } from 'react';
import { 
  ShieldCheck, Plane, MessageCircle, Lock, 
  Smartphone, ArrowRight, CheckCircle2, 
  Store, Zap, TrendingUp, AlertCircle, 
  Barcode, Receipt, Wallet, Printer, 
  Clock, ShieldAlert, Users, Landmark,
  BookOpen, Loader2, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LandingPageProps {
  onStartTrial: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTrial }) => {
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

      {/* The Four Pillars */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">The Four Pillars of the Boss</h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Why smart owners choose NaijaShop</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl space-y-6 group hover:border-emerald-500 transition-all duration-500">
               <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 transform -rotate-6 group-hover:rotate-0 transition-transform">
                  <Plane size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">100% Offline Power</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">Sell in Airplane Mode. No network lag, zero data costs. Even if light is off for one week, your records are safe on your phone.</p>
               </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl space-y-6 group hover:border-emerald-500 transition-all duration-500">
               <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-100 transform rotate-6 group-hover:rotate-0 transition-transform">
                  <Lock size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Staff Anti-Theft Lock</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">Staff can record sales but they CANNOT delete them, change prices, or see your total profit. You hold the secret Admin PIN!</p>
               </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl space-y-6 group hover:border-emerald-500 transition-all duration-500">
               <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-amber-100 transform -rotate-3 group-hover:rotate-0 transition-transform">
                  <Landmark size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">The Transfer Terminal</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">A professional screen for bank transfers. Stop 'Confirming Alerts' for 10 minutes—our Soft POS shows your details clearly to the customer.</p>
               </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl space-y-6 group hover:border-emerald-500 transition-all duration-500">
               <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-red-100 transform rotate-3 group-hover:rotate-0 transition-transform">
                  <ShieldAlert size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Pharmacy-Grade Alerts</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">Use AI to snap and read expiry dates. The app shouts in <span className="text-red-600 font-bold">RED</span> 7 days before items expire. Never sell bad medicine or food again.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-black text-slate-950 uppercase italic leading-none">Everything You Need <br/>to <span className="text-emerald-600">Dominate</span> the Market</h2>
            <div className="space-y-6">
              {[
                { icon: <Barcode className="text-emerald-500"/>, title: "Barcode Scanner", desc: "Point your camera, snap, and sell in 1 second." },
                { icon: <MessageCircle className="text-emerald-500"/>, title: "WhatsApp Receipts", desc: "No printer? No problem. Send branded receipts to customers' phones." },
                { icon: <BookOpen className="text-emerald-500" size={20}/>, title: "Debt & Wallet Book", desc: "Know who owes you money and send reminders in 1 click." },
                { icon: <TrendingUp className="text-emerald-500"/>, title: "Bulk Inflation Protector", desc: "Fuel or Dollar go up? Increase all prices by 10% in 1 second." },
                { icon: <Printer className="text-emerald-500"/>, title: "Bluetooth Printing", desc: "Connect your 58mm mini-printer and print like Shoprite." }
              ].map((f, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="p-2 bg-emerald-50 rounded-xl mt-1">{f.icon}</div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-sm">{f.title}</h4>
                    <p className="text-slate-500 text-sm font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-600/10 blur-[100px] rounded-full"></div>
            <img src="https://i.ibb.co/XxDDvb3k/gemini-3-pro-image-preview-nano-banana-pro-a-A-high-quality-3-D-is.png" alt="POS Mockup" className="relative z-10 w-full rounded-[64px] shadow-2xl border-8 border-white" />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-emerald-950 py-24 px-6 text-white text-center overflow-hidden relative">
        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center mx-auto border border-white/20">
            <ShieldCheck size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">Security You Can Trust</h2>
          <p className="text-emerald-100/70 text-lg font-medium leading-relaxed">
            Your business is locked to YOUR phone using a <span className="text-white font-black">Unique Request Code.</span> 
            Your data is encrypted and backed up to your private WhatsApp. We don't see your sales, 
            and hackers can't touch your records. It's 100% private.
          </p>
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Device Fingerprinting</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Private Backups</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Zero Cloud Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <div className="inline-block bg-amber-500 text-white text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-[0.3em] shadow-lg">New Year Special Special 🇳🇬</div>
            <h2 className="text-5xl font-black text-slate-950 uppercase italic tracking-tighter">Own Your Shop Forever</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Standard */}
            <div className="bg-slate-50 p-10 rounded-[56px] border border-slate-100 flex flex-col justify-between hover:scale-105 transition-transform">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Plan</p>
                <div className="space-y-1">
                   <h3 className="text-4xl font-black text-slate-950">₦10,000</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase">Per Year</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle2 size={16} className="text-emerald-600"/> 1-Year Full Support</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle2 size={16} className="text-emerald-600"/> All Pro Features</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle2 size={16} className="text-emerald-600"/> Daily WhatsApp Backups</li>
                </ul>
              </div>
              <button onClick={handleStartTrialClick} disabled={isPreparing} className="mt-10 w-full bg-slate-900 text-white font-black py-5 rounded-[28px] uppercase tracking-widest text-xs active:scale-95 transition-all">Start Trial</button>
            </div>

            {/* Lifetime */}
            <div className="bg-emerald-600 p-10 rounded-[56px] text-white flex flex-col justify-between relative shadow-2xl shadow-emerald-200 overflow-hidden hover:scale-105 transition-transform">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} /></div>
              <div className="space-y-6 relative z-10">
                <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Lifetime License</p>
                <div className="space-y-1">
                   <h3 className="text-4xl font-black text-white">₦25,000</h3>
                   <p className="text-xs font-bold text-emerald-200 uppercase">Pay Once. Own Forever.</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-xs font-bold text-emerald-50"><CheckCircle2 size={16} className="text-white"/> Unlimited Staff Phones</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-emerald-50"><CheckCircle2 size={16} className="text-white"/> Lifetime Free Updates</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-emerald-50"><CheckCircle2 size={16} className="text-white"/> Priority Boss Support</li>
                </ul>
              </div>
              <button 
                onClick={() => window.open('https://wa.me/2347062228026?text=' + encodeURIComponent("I'm ready for the Lifetime License. Send me the payment link."), '_blank')}
                className="mt-10 w-full bg-white text-emerald-600 font-black py-5 rounded-[28px] uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl"
              >
                Buy Lifetime Now
              </button>
            </div>
          </div>
          <p className="text-center mt-12 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Secure Payment via Paystack or WhatsApp</p>
        </div>
      </section>

      {/* Objection FAQ */}
      <section className="px-6 py-24 bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Oga, We Hear You.</h2>
            <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.2em]">Common Questions from Shop Owners</p>
          </div>

          <div className="space-y-4">
            {[
              { q: "What if my phone spoils or gets lost?", a: "Just install the app on your new phone and import your WhatsApp backup file. Everything—your products, sales, and debt records—will return in 10 seconds." },
              { q: "Do I need a big laptop or expensive hardware?", a: "No! This app is designed for your Android phone or tablet. It fits in your pocket so you can sell from anywhere." },
              { q: "Can I track my staff when I'm not in the shop?", a: "Yes! You can clone your inventory to their phones for free. At the end of the day, they send you a sync file via WhatsApp so you can see all sales from your house." },
              { q: "Is it really 100% Offline?", a: "Yes. You only need data for the 5 seconds it takes to activate the app. After that, put your phone in Airplane Mode and start selling." }
            ].map((faq, i) => (
              <div key={i} className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-4 group hover:bg-white/10 transition-all">
                <h4 className="text-xl font-black uppercase italic tracking-tight text-emerald-400">"{faq.q}"</h4>
                <p className="text-slate-400 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="text-center pt-8">
             <button 
                onClick={handleStartTrialClick}
                disabled={isPreparing}
                className="bg-emerald-600 text-white font-black px-12 py-7 rounded-[32px] text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
              >
                Launch My Shop Now <ArrowRight />
             </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">NaijaShop POS Systems Nigeria 🇳🇬</span>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2025 Local Secure Software Solutions</p>
      </footer>
    </div>
  );
};
